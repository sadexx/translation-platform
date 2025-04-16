import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { compare, hash } from "bcrypt";
import { Repository } from "typeorm";
import {
  IAddNewRoleData,
  ICreateCompanyAdminData,
  IGetUserByEmailData,
  IGetUserByEmailOrPhoneData,
  IGetUserByIdData,
  IGetUserByPhoneData,
  IPhoneVerification,
  IUpdateUserData,
} from "src/modules/users/common/interfaces";
import {
  IAddPhoneData,
  ICreatePasswordData,
  ICreateUserData,
  IStartRegistrationSessionData,
} from "src/modules/auth/common/interfaces";
import { User } from "src/modules/users/entities";
import { UsersRolesService } from "src/modules/users-roles/services";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { AwsPinpointService } from "src/modules/aws-pinpoint/services";
import { RedisService } from "src/modules/redis/services";
import { EmailsService } from "src/modules/emails/services";
import { ChangeEmailDto, ChangePasswordDto } from "src/modules/users/common/dto";
import { isEmail, isPhoneNumber } from "class-validator";
import {
  RESTORATION_KEY_QUERY_PARAM,
  RESTORATION_TOKEN_QUERY_PARAM,
  RESTORATION_TYPE,
  ROLE_QUERY_PARAM,
} from "src/modules/auth/common/constants/constants";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { JwtRestorationService } from "src/modules/tokens/common/libs/restoration-token";
import { randomUUID } from "node:crypto";
import { ERestorationType } from "src/modules/users/common/enums";
import { COMPANY_LFH_FULL_NAME } from "src/modules/companies/common/constants/constants";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { Company } from "src/modules/companies/entities";
import {
  COMPANY_ADMIN_ROLES,
  COMPANY_SUPER_ADMIN_ROLES,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_SECONDS_IN_DAY,
  ROLES_WHO_CAN_DELETE_USER,
} from "src/common/constants";
import { checkCompanyOwnerHelper } from "src/modules/companies/common/helpers";
import { UserGetOutput } from "src/modules/users/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly usersRolesService: UsersRolesService,
    private readonly configService: ConfigService,
    private readonly awsPinpointService: AwsPinpointService,
    private readonly redisService: RedisService,
    private readonly emailsService: EmailsService,
    private readonly jwtRestorationService: JwtRestorationService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly helperService: HelperService,
  ) {}

  public async create(createUserData: ICreateUserData): Promise<User> {
    const userRole = await this.usersRolesService.createByRoleName(createUserData.role);

    const newUser = this.userRepository.create({
      ...createUserData,
      isEmailVerified: true,
      userRoles: [userRole],
    });

    return await this.upsert(newUser);
  }

  public async createCompanyAdmin(createCompanyAdminData: ICreateCompanyAdminData): Promise<User> {
    const role = createCompanyAdminData.role as unknown as EUserRoleName;
    const userRole = await this.usersRolesService.createByRoleName(role);

    return this.userRepository.create({
      ...createCompanyAdminData,
      userRoles: [userRole],
    });
  }

  public async createPassword(createUserData: ICreatePasswordData): Promise<User> {
    const user = await this.getByEmail({
      email: createUserData.email,
    });

    if (!user || user.password) {
      throw new ForbiddenException("Unable to add password to your account");
    }

    const userData = { ...user, password: createUserData.password };

    await this.hashPassword(userData);
    await this.upsert(this.userRepository.create(userData));

    return user;
  }

  public async checkPhoneNumberAvailability(addPhoneData: IAddPhoneData): Promise<User> {
    const user = await this.getByEmail({
      email: addPhoneData.email,
    });

    if (!user) {
      throw new ForbiddenException("There is no user with such email");
    }

    const userWithPhoneNumber = await this.getByPhone({ phoneNumber: addPhoneData.phoneNumber });

    if (userWithPhoneNumber && userWithPhoneNumber.id !== user.id) {
      throw new BadRequestException("User with this phone number already exists. Try log in to your account");
    }

    return user;
  }

  public async getByEmailOrPhone(getUserByEmailOrPhoneData: IGetUserByEmailOrPhoneData): Promise<{
    user: User;
    isIdentifiedByPhone: boolean;
    isIdentifiedByEmail: boolean;
  }> {
    let user: User | null = null;
    const isIdentifiedByPhone = isPhoneNumber(getUserByEmailOrPhoneData.identification);
    const isIdentifiedByEmail = isEmail(getUserByEmailOrPhoneData.identification);

    if (!isIdentifiedByPhone && !isIdentifiedByEmail) {
      throw new NotFoundException("Incorrect identification data");
    }

    if (isIdentifiedByPhone) {
      user = await this.getByPhone({
        phoneNumber: getUserByEmailOrPhoneData.identification,
        relations: getUserByEmailOrPhoneData.relations,
      });
    }

    if (isIdentifiedByEmail) {
      user = await this.getByEmail({
        email: getUserByEmailOrPhoneData.identification,
        relations: getUserByEmailOrPhoneData.relations,
      });
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { user, isIdentifiedByPhone, isIdentifiedByEmail };
  }

  public async verifyUser(identification: string, password: string): Promise<User> {
    const { user } = await this.getByEmailOrPhone({
      identification,
      relations: { userRoles: { role: true } },
    });

    if (!user) {
      throw new NotFoundException("Incorrect password or email");
    }

    if (!user.password) {
      throw new BadRequestException("Can't find password. Try to login with third party auth");
    }

    const isPasswordCorrect = await compare(password, user.password);

    if (!isPasswordCorrect) {
      throw new NotFoundException("Incorrect password or email");
    }

    return user;
  }

  public async hashPassword(userData: ICreatePasswordData): Promise<void> {
    if (userData.password !== undefined) {
      userData.password = await hash(
        userData.password,
        this.configService.getOrThrow<number>("hashing.bcryptSaltRounds"),
      );
    }
  }

  public async getById(getUserByIdData: IGetUserByIdData): Promise<UserGetOutput> {
    const user = await this.userRepository.findOne({
      where: { id: getUserByIdData.id },
      relations: getUserByIdData.relations,
    });

    if (!user) {
      throw new NotFoundException("Account with such id doesn't exist");
    }

    return user;
  }

  public async getByEmail(getUserByEmailData: IGetUserByEmailData): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email: getUserByEmailData.email },
      relations: getUserByEmailData.relations,
    });
  }

  public async getByPhone(getUserByPhoneData: IGetUserByPhoneData): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { phoneNumber: getUserByPhoneData.phoneNumber },
      relations: getUserByPhoneData.relations,
    });
  }

  public async addNewRole(addNewRoleData: IAddNewRoleData): Promise<User> {
    const user = await this.getById({ id: addNewRoleData.userId, relations: { userRoles: { role: true } } });
    const userRole = user.userRoles.find(({ role }) => role.name === addNewRoleData.role);

    if (userRole) {
      if (userRole.isRegistrationFinished) {
        throw new BadRequestException("User already registered with this role");
      }

      return user;
    }

    const newUserRole = await this.usersRolesService.createByUserIdAndRoleName(user.id, addNewRoleData.role);
    user.userRoles = [...user.userRoles, newUserRole];

    return await this.upsert(user);
  }

  public async addNewUserRole(addNewRoleData: IAddNewRoleData): Promise<UserRole> {
    const newUserRole = await this.usersRolesService.createByUserIdAndRoleName(
      addNewRoleData.userId,
      addNewRoleData.role,
    );

    return await this.usersRolesService.upsert(newUserRole);
  }

  public async update(id: string, data: IUpdateUserData): Promise<void> {
    await this.userRepository.save({ id, ...data });

    return;
  }

  public async upsert(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  public flatUserRoles(userRoles: UserRole[]): EUserRoleName[] {
    return userRoles.map(({ role }) => role.name);
  }

  public async sendNewPhoneNumberVerificationCode(newPhoneNumber: string, userId: string): Promise<MessageOutput> {
    const userWithSamePhoneNumber = await this.getByPhone({ phoneNumber: newPhoneNumber });

    if (userWithSamePhoneNumber) {
      throw new BadRequestException("User with this phone number already exists.");
    }

    const confirmationCode = await this.awsPinpointService.sendVerificationCode(newPhoneNumber);
    await this.redisService.setJson(userId, { phoneNumber: newPhoneNumber, confirmationCode });

    return { message: "Phone verification code is sent" };
  }

  public async verifyNewPhoneNumberCode(verificationCode: string, userId: string): Promise<MessageOutput> {
    const user = await this.getById({ id: userId });

    if (!user) {
      throw new BadRequestException("Can't verify phone number");
    }

    const redisPayload = await this.redisService.getJson<IPhoneVerification>(userId);

    if (!redisPayload) {
      throw new BadRequestException("Can't verify phone number");
    }

    const userWithSamePhoneNumber = await this.getByPhone({ phoneNumber: redisPayload.phoneNumber });

    if (userWithSamePhoneNumber) {
      throw new BadRequestException("User with this phone number already exists.");
    }

    if (redisPayload.confirmationCode !== verificationCode) {
      throw new BadRequestException("Invalid code entered. Please try again.");
    }

    await this.redisService.del(userId);

    user.phoneNumber = redisPayload.phoneNumber;
    await this.upsert(user);

    return { message: "Phone number is verified" };
  }

  public async sendNewEmailVerificationCode(changeEmail: ChangeEmailDto): Promise<MessageOutput> {
    const user = await this.getByEmail({
      email: changeEmail.email,
    });

    if (user) {
      throw new ForbiddenException("This email is already registered.");
    }

    await this.emailsService.sendConfirmationCode(changeEmail.email);

    return { message: "Email verification code is sent." };
  }

  public async verifyNewEmailCode(email: string, verificationCode: string, userId: string): Promise<MessageOutput> {
    const userWithSameEmail = await this.getByEmail({ email });

    if (userWithSameEmail) {
      throw new ForbiddenException("This email is already registered.");
    }

    const user = await this.getById({ id: userId });

    const redisPayload = await this.redisService.get(email);

    if (!redisPayload) {
      throw new BadRequestException("Can't verify email");
    }

    if (redisPayload !== verificationCode) {
      throw new BadRequestException("Invalid code entered. Please try again.");
    }

    await this.redisService.del(email);

    user.email = email;
    await this.upsert(user);

    return { message: "Email is verified" };
  }

  public async deleteUserRequest(userRoleId: string, user: ITokenUserData): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id: userRoleId },
      relations: { user: { userRoles: true }, address: true, profile: true, role: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role with this id does not exist.");
    }

    await this.helperService.checkIfUserHasUncompletedAppointmentsBeforeDelete(userRole.id);

    let isSelfDeleting: boolean = true;

    let emailToSendRestorationLink: string | undefined = userRole?.profile?.contactEmail;
    let userRoleToSendRestorationLink: UserRole = userRole;
    let nameOfPersonToSendRestorationLink: string = `${userRole?.profile?.firstName} ${userRole?.profile?.lastName}`;

    if (COMPANY_ADMIN_ROLES.includes(user.role)) {
      const admin = await this.userRoleRepository.findOne({
        where: { id: user.userRoleId },
        relations: { profile: true, role: true },
      });

      if (!admin || !admin.operatedByCompanyId) {
        throw new BadRequestException("Admin does not exist or company not set!");
      }

      const company = await this.companyRepository.findOne({ where: { id: userRole.operatedByCompanyId } });

      if (!company) {
        throw new BadRequestException("Administrated company for this user not exist!");
      }

      checkCompanyOwnerHelper(company, user, admin, userRole);

      isSelfDeleting = false;
      emailToSendRestorationLink = admin.profile.contactEmail;
      userRoleToSendRestorationLink = admin;
      nameOfPersonToSendRestorationLink = `${admin.profile.firstName} ${admin.profile.lastName}`;
    }

    if (user.role === EUserRoleName.SUPER_ADMIN) {
      const superAdmin = await this.userRoleRepository.findOne({
        where: { id: user.userRoleId },
        relations: { profile: true, role: true },
      });

      if (!superAdmin) {
        throw new BadRequestException("Account not found!");
      }

      isSelfDeleting = false;
      emailToSendRestorationLink = superAdmin.profile.contactEmail;
      userRoleToSendRestorationLink = superAdmin;
      nameOfPersonToSendRestorationLink = `${superAdmin.profile.firstName} ${superAdmin.profile.lastName}`;
    }

    if (!ROLES_WHO_CAN_DELETE_USER.includes(user.role) && userRole.userId !== user.id) {
      throw new ForbiddenException("Forbidden request!");
    }

    if (userRole.accountStatus !== EAccountStatus.ACTIVE && userRole.accountStatus !== EAccountStatus.DEACTIVATED) {
      if (userRole.user.userRoles.length > 1) {
        await this.userRoleRepository.delete({ id: userRoleId });
      } else {
        await this.userRepository.delete({ id: userRole.userId });
      }

      if (userRole.interpreterProfile?.interpreterBadgePdf) {
        await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole);
      }

      return;
    }

    if (!emailToSendRestorationLink) {
      throw new BadRequestException("Fill email, please!");
    }

    const restoringPeriodInSeconds = this.configService.getOrThrow<number>("jwt.restore.expirationTimeSeconds");
    const restorationKey = randomUUID();

    await this.userRoleRepository.update(
      { id: userRoleId },
      {
        isInDeleteWaiting: true,
        deletingDate: new Date(new Date().getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND),
        restorationKey,
      },
    );

    const restorationToken = await this.jwtRestorationService.signAsync({
      email: emailToSendRestorationLink,
      userId: userRoleToSendRestorationLink.userId,
      userRole: userRoleToSendRestorationLink.role.name,
      isInvitation: false,
      isOauth: false,
    } as IStartRegistrationSessionData);

    const completeRestorationLink = `${this.configService.getOrThrow<string>("frontend.restorationRedirectionLink")}?${RESTORATION_TOKEN_QUERY_PARAM}=${restorationToken}&${ROLE_QUERY_PARAM}=${userRole.role.name}&${RESTORATION_KEY_QUERY_PARAM}=${restorationKey}&${RESTORATION_TYPE}=${ERestorationType.USER}`;

    const linkDurationString = restoringPeriodInSeconds / NUMBER_OF_SECONDS_IN_DAY + " days";

    if (isSelfDeleting) {
      await this.emailsService.sendUserSelfRestorationLink(
        emailToSendRestorationLink,
        completeRestorationLink,
        linkDurationString,
        nameOfPersonToSendRestorationLink,
        userRole.role.name,
      );
    }

    if (!isSelfDeleting) {
      await this.emailsService.sendUserRestorationLink(
        emailToSendRestorationLink,
        completeRestorationLink,
        linkDurationString,
        nameOfPersonToSendRestorationLink,
        `${userRole.profile.firstName} ${userRole.profile.lastName}`,
        userRole.user.platformId,
        userRole.role.name,
        userRole.operatedByCompanyName,
      );
    }

    return;
  }

  public async restoreUserAccount(restorationKey: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({ where: { restorationKey } });

    if (!userRole) {
      throw new BadRequestException("Incorrect restoration key!");
    }

    await this.userRoleRepository.update(
      { id: userRole.id },
      {
        isInDeleteWaiting: false,
        deletingDate: null,
        restorationKey: null,
      },
    );

    return;
  }

  public async isUserNotDeletedAndNotDeactivated(userRole: UserRole): Promise<boolean> {
    if (COMPANY_SUPER_ADMIN_ROLES.includes(userRole.role.name)) {
      const company = await this.companyRepository.findOne({ where: { superAdminId: userRole.userId } });

      if (company && company.isInDeleteWaiting) {
        throw new ForbiddenException("Your company has been deleted. You can restore company by link on your post");
      }
    }

    if (userRole.operatedByCompanyName !== COMPANY_LFH_FULL_NAME) {
      if (!userRole.operatedByCompanyId) {
        throw new BadRequestException("Operated company is not find!");
      }

      const company = await this.companyRepository.findOne({
        where: { id: userRole.operatedByCompanyId },
      });

      if (!company) {
        throw new ForbiddenException("Your company is not exist!");
      }

      if (company.status === ECompanyStatus.DEACTIVATED) {
        throw new ForbiddenException("Your company account has been deactivated. Please contact your admin");
      }

      if (company.isInDeleteWaiting) {
        throw new ForbiddenException("Your company account has been deleted. Please contact your admin");
      }
    }

    if (userRole.isInDeleteWaiting) {
      throw new ForbiddenException(
        "Your account has been deleted. Please use the restoration link sent to your email or contact the LFH Support Team.",
      );
    }

    if (userRole.accountStatus === EAccountStatus.DEACTIVATED) {
      throw new ForbiddenException("Your account has been locked. Please contact the LFH Support Team.");
    }

    return true;
  }

  public async changeRegisteredPassword(dto: ChangePasswordDto, id: string): Promise<void> {
    const user = await this.getById({ id });

    if (!user || !user.password) {
      throw new BadRequestException("User does not exist or password not set.");
    }

    const isOldPasswordValid = await compare(dto.oldPassword, user.password);

    if (!isOldPasswordValid) {
      throw new BadRequestException("Incorrect current password.");
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException("New password cannot be the same as the current password.");
    }

    await this.userRepository.update(id, {
      password: await hash(dto.newPassword, this.configService.getOrThrow<number>("hashing.bcryptSaltRounds")),
    });

    return;
  }
}
