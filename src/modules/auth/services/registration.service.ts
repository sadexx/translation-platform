import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  IAddPhoneData,
  ICreatePasswordData,
  IRegisterUserData,
  IRetrieveRegistrationStepsData,
  IStartNewRoleRegistrationData,
  IStartRegistrationSessionData,
  IVerifyData,
} from "src/modules/auth/common/interfaces";
import { JwtEmailConfirmationService } from "src/modules/tokens/common/libs/email-confirmation-token";
import { EmailsService } from "src/modules/emails/services";
import { User } from "src/modules/users/entities";
import { UsersRolesService } from "src/modules/users-roles/services";
import { JwtRegistrationService } from "src/modules/tokens/common/libs/registration-token";
import { RedisService } from "src/modules/redis/services";
import { UsersService } from "src/modules/users/services";
import { AwsPinpointService } from "src/modules/aws-pinpoint/services";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ESuperAdminEmail } from "src/modules/auth/common/enums";
import { REGISTRATION_TOKEN_QUERY_PARAM, ROLE_QUERY_PARAM } from "src/modules/auth/common/constants";
import { ConfigService } from "@nestjs/config";
import { EmailConfirmationTokenOutput, RegistrationStepsOutput } from "src/modules/auth/common/outputs";
import { MockService } from "src/modules/mock/services";
import { JSON_INDENTATION_LEVEL, NUMBER_OF_DAYS_IN_WEEK } from "src/common/constants";
import { GetRegistrationLinkDto } from "src/modules/auth/common/dto";
import { addDays, isBefore } from "date-fns";
import { LokiLogger } from "src/common/logger";
import { UserRole } from "src/modules/users-roles/entities";
import { IPhoneVerification } from "src/modules/users/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Injectable()
export class RegistrationService {
  private readonly lokiLogger = new LokiLogger(RegistrationService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtRegistrationService: JwtRegistrationService,
    private readonly jwtEmailConfirmationService: JwtEmailConfirmationService,
    private readonly usersRolesService: UsersRolesService,
    private readonly awsPinpointService: AwsPinpointService,
    private readonly emailsService: EmailsService,
    private readonly redisService: RedisService, // TODO: change redis to DB
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
  ) {}

  public async startRegistration(registerUserData: IRegisterUserData): Promise<EmailConfirmationTokenOutput> {
    const user = await this.usersService.getByEmail({
      email: registerUserData.email,
      relations: { userRoles: { role: true } },
    });

    if (user) {
      const userRole = user.userRoles.some(({ isRegistrationFinished }) => isRegistrationFinished);

      if (userRole) {
        throw new ForbiddenException("This email is already registered. Log in to your account");
      }
    }

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    if (mockEnabled) {
      const mock = await this.mockService.mockRegistration(registerUserData);

      if (mock.isMocked && mock.result) {
        return mock.result;
      }
    }

    await this.emailsService.sendConfirmationCode(registerUserData.email);

    const emailConfirmationToken = await this.jwtEmailConfirmationService.signAsync({
      email: registerUserData.email,
      userRole: registerUserData.role,
      clientIPAddress: registerUserData.IPAddress,
      clientUserAgent: registerUserData.userAgent,
    });

    return { emailConfirmationToken };
  }

  public async startNewRoleRegistration(startNewRoleRegistrationData: IStartNewRoleRegistrationData): Promise<string> {
    await this.usersService.addNewRole({
      userId: startNewRoleRegistrationData.user.id!,
      role: startNewRoleRegistrationData.role,
    });

    return await this.startRegistrationSession({
      email: startNewRoleRegistrationData.user.email,
      userId: startNewRoleRegistrationData.user.id,
      userRole: startNewRoleRegistrationData.role,
      isAdditionalRole: true,
      clientIPAddress: startNewRoleRegistrationData.user.clientIPAddress,
      clientUserAgent: startNewRoleRegistrationData.user.clientUserAgent,
    });
  }

  public async verifyEmail(verifyEmailData: IVerifyData): Promise<string> {
    // TODO: change redis to DB
    if (verifyEmailData.isInvitation) {
      throw new BadRequestException("Proceed to phone verification, as your email is already verified");
    }

    await this.verifyCode(verifyEmailData.email, verifyEmailData.verificationCode);

    let user = await this.usersService.getByEmail({
      email: verifyEmailData.email,
      relations: { userRoles: { role: true } },
    });

    if (user) {
      const userRole = user.userRoles.find(({ role }) => role.name === verifyEmailData.role);

      if (!userRole) {
        await this.usersRolesService.createByUserIdAndRoleName(user.id, verifyEmailData.role);
      }
    } else {
      user = await this.usersService.create({ email: verifyEmailData.email, role: verifyEmailData.role });
    }

    return await this.startRegistrationSession({
      email: verifyEmailData.email,
      userId: user.id,
      userRole: verifyEmailData.role,
      clientIPAddress: verifyEmailData.IPAddress,
      clientUserAgent: verifyEmailData.userAgent,
    });
  }

  public async verifyCode(key: string, receivedCode: string, isDeleted = true): Promise<boolean> {
    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    if (mockEnabled) {
      const mock = this.mockService.mockVerifyCode(key);

      if (mock.isMocked) {
        return true;
      }
    }

    const savedCode = await this.redisService.get(key);

    if (savedCode !== receivedCode) {
      throw new NotFoundException("Your code is incorrect");
    }

    if (isDeleted) {
      await this.redisService.del(key);
    }

    return true;
  }

  public async createPassword(
    createPasswordData: ICreatePasswordData,
    query?: GetRegistrationLinkDto,
  ): Promise<MessageOutput> {
    if (query?.userId && query?.role) {
      await this.verifyRegistrationLink(query);
    }

    await this.usersService.createPassword(createPasswordData);

    return { message: "Password successfully created" };
  }

  public async sendPhoneNumberVerificationCode(addPhoneData: IAddPhoneData): Promise<MessageOutput> {
    // TODO: change redis to DB
    await this.usersService.checkPhoneNumberAvailability(addPhoneData);

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    if (mockEnabled) {
      const mock = await this.mockService.mockSendPhoneNumberVerificationCode(addPhoneData);

      if (mock.isMocked && mock.result) {
        return mock.result;
      }
    }

    const confirmationCode = await this.awsPinpointService.sendVerificationCode(addPhoneData.phoneNumber);
    await this.redisService.setJson(addPhoneData.email, { phoneNumber: addPhoneData.phoneNumber, confirmationCode });

    return { message: "Phone verification code is send" };
  }

  public async verifyPhoneNumber(verifyPhoneData: IVerifyData): Promise<MessageOutput> {
    const user = await this.usersService.getByEmail({
      email: verifyPhoneData.email,
    });

    if (!user) {
      throw new BadRequestException("Can't verify phone number");
    }

    const redisPayload = await this.redisService.getJson<IPhoneVerification>(verifyPhoneData.email);

    if (!redisPayload) {
      throw new BadRequestException("Can't verify phone number");
    }

    if (redisPayload.confirmationCode !== verifyPhoneData.verificationCode) {
      throw new BadRequestException("Can't verify phone number");
    }

    await this.redisService.del(verifyPhoneData.email);

    user.phoneNumber = redisPayload.phoneNumber;
    await this.usersService.upsert(user);

    return { message: "Phone number is verified" };
  }

  public async agreeToConditions(
    userId: string,
    role: EUserRoleName,
    query?: GetRegistrationLinkDto,
  ): Promise<MessageOutput> {
    if (query?.userId && query?.role) {
      await this.verifyRegistrationLink(query);
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(userId, role);

    if (userRole.isUserAgreedToTermsAndConditions) {
      throw new BadRequestException("You have already agreed to the terms and conditions");
    }

    await this.usersRolesService.upsert({ ...userRole, isUserAgreedToTermsAndConditions: true });

    return { message: "You agreed to platform conditions" };
  }

  public async retrieveRegistrationSteps(
    retrieveRegistrationStepsData: IRetrieveRegistrationStepsData,
  ): Promise<RegistrationStepsOutput> {
    if (!retrieveRegistrationStepsData.userId) {
      throw new ForbiddenException("You should verify email first");
    }

    const user = await this.usersService.getById({
      id: retrieveRegistrationStepsData.userId,
      relations: { userRoles: { role: true } },
    });

    if (!user) {
      throw new NotFoundException("Can't find user with such email");
    }

    const userRole = user.userRoles.find(({ role }) => role.name === retrieveRegistrationStepsData.role);

    if (!userRole) {
      this.lokiLogger.error(
        `retrieveRegistrationSteps error, incorrect role. Data: ${JSON.stringify(retrieveRegistrationStepsData, null, JSON_INDENTATION_LEVEL)}`,
      );
      throw new ForbiddenException("Incorrect role");
    }

    const isPhoneVerified = Boolean(user.phoneNumber);
    const conditionsAgreedTo = userRole.isUserAgreedToTermsAndConditions;
    const isPasswordSet = retrieveRegistrationStepsData.isOauth || Boolean(user.password);

    return {
      isPasswordSet,
      isPhoneVerified,
      conditionsAgreedTo,
    };
  }

  public async startRegistrationSession(data: IStartRegistrationSessionData): Promise<string> {
    return await this.jwtRegistrationService.signAsync(data);
  }

  public checkRegistrationSteps(user: User, userRole: UserRole, isOauth: boolean): void {
    if (userRole.isRegistrationFinished) {
      throw new ForbiddenException("Registration is already finished");
    }

    if (!isOauth) {
      if (!user.isEmailVerified) {
        throw new ForbiddenException("Verify your email address");
      }

      if (!user.password) {
        throw new ForbiddenException("Set up a password");
      }
    }

    if (!user.phoneNumber) {
      throw new ForbiddenException("Verify your phone number");
    }

    if (!userRole.isUserAgreedToTermsAndConditions) {
      throw new ForbiddenException("Please agree to the terms and conditions");
    }
  }

  public async startSuperAdminRegistration(
    email: ESuperAdminEmail,
    clientIPAddress: string,
    clientUserAgent: string,
  ): Promise<MessageOutput> {
    let user = await this.usersService.getByEmail({ email });

    if (user) {
      throw new ForbiddenException("This email is already registered. Log in to your account");
    }

    user = await this.usersService.create({ email, role: EUserRoleName.SUPER_ADMIN });

    const registrationToken = await this.startRegistrationSession({
      email,
      userId: user.id,
      userRole: EUserRoleName.SUPER_ADMIN,
      clientIPAddress,
      clientUserAgent,
    });

    const superAdminRedirectLink = this.configService.getOrThrow<string>("frontend.superAdminRedirectLink");

    await this.emailsService.sendSuperAdminActivationLink(
      email,
      `${superAdminRedirectLink}?${REGISTRATION_TOKEN_QUERY_PARAM}=${registrationToken}&${ROLE_QUERY_PARAM}=${EUserRoleName.SUPER_ADMIN}`,
    );

    return { message: "Activation link was sent" };
  }

  public async verifyRegistrationLink(query: GetRegistrationLinkDto): Promise<void> {
    const userRole = await this.usersRolesService.getByUserIdAndRoleName(query.userId, query.role);

    if (userRole.invitationLinkWasCreatedAt) {
      const currentDate = new Date();
      const expirationDate = addDays(userRole.invitationLinkWasCreatedAt, NUMBER_OF_DAYS_IN_WEEK);

      if (!userRole || isBefore(expirationDate, currentDate)) {
        throw new BadRequestException("Registration link has expired.");
      }
    }
  }
}
