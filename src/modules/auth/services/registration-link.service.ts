import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE, NUMBER_OF_SECONDS_IN_DAY } from "src/common/constants";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { User } from "src/modules/users/entities";
import {
  REGISTRATION_TOKEN_QUERY_PARAM,
  ROLE_QUERY_PARAM,
  USER_ID_QUERY_PARAM,
} from "src/modules/auth/common/constants/constants";
import { IStartRegistrationSessionData } from "src/modules/auth/common/interfaces";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailsService } from "src/modules/emails/services";
import { Role } from "src/modules/roles/entities";
import { JwtRegistrationService } from "src/modules/tokens/common/libs/registration-token";
import { UserProfilesService, UsersService } from "src/modules/users/services";
import { ResendRegistrationLinkDto, SendRegistrationLinkDto } from "src/modules/auth/common/dto";
import { RegistrationLinkOutput } from "src/modules/auth/common/outputs";
import { ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING } from "src/modules/companies/common/constants/constants";
import { HelperService } from "src/modules/helper/services";
import { Address } from "src/modules/addresses/entities";

@Injectable()
export class RegistrationLinkService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
    private readonly jwtRegistrationService: JwtRegistrationService,
    private readonly helperService: HelperService,
    private readonly userProfilesService: UserProfilesService,
  ) {}

  public async sendRegistrationLink(dto: SendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    const { user, userIsAlreadyExist, createdUserRole } = await this.prepareUserAndRole(dto.email, dto.role, {
      phoneNumber: dto.phoneNumber,
    });

    if (dto.address && dto.profileInformation) {
      const newAddress = this.addressRepository.create(dto.address);

      createdUserRole.address = await this.addressRepository.save(newAddress);

      createdUserRole.profile = await this.userProfilesService.constructAndCreateUserProfile(dto.profileInformation);
    }

    await this.userRoleRepository.save(createdUserRole);

    const { registrationLink, linkDurationString } = await this.generateRegistrationLink(
      user.email,
      user.id,
      dto.role,
      userIsAlreadyExist,
    );

    await this.emailsService.sendUserRegistrationLink(user.email, registrationLink, linkDurationString, dto.role);

    return {
      id: user.id,
      linkCreationTime: new Date(),
    };
  }

  public async resendRegistrationLink(dto: ResendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    const user = await this.usersService.getByEmail({
      email: dto.email,
      relations: { userRoles: { role: true, profile: true, address: true } },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const role = await this.roleRepository.findOne({ where: { name: dto.role } });

    if (!role) {
      throw new BadRequestException("Role does not exist.");
    }

    const existingUserRole = await this.helperService.getUserRoleByName(user, dto.role);

    if (user.isRegistrationFinished && existingUserRole.isRegistrationFinished) {
      throw new BadRequestException("User already finished registration for this role");
    }

    await this.checkInvitationLinkTimeLimit(existingUserRole);

    let updatedUser: User = user;

    if (!user.isRegistrationFinished) {
      updatedUser = await this.handleUserRoleRecreation(dto, user, existingUserRole);
    }

    const { registrationLink, linkDurationString } = await this.generateRegistrationLink(
      updatedUser.email,
      updatedUser.id,
      dto.role,
      updatedUser.isRegistrationFinished,
    );

    await this.emailsService.sendUserRegistrationLink(user.email, registrationLink, linkDurationString, dto.role);

    return {
      id: updatedUser.id,
      linkCreationTime: new Date(),
    };
  }

  public async prepareUserAndRole(
    email: string,
    roleName: EUserRoleName,
    extraData: { phoneNumber?: string } = {},
  ): Promise<{ user: User; userIsAlreadyExist: boolean; createdUserRole: UserRole }> {
    if (extraData.phoneNumber) {
      const existPhone = await this.usersService.getByPhone({ phoneNumber: extraData.phoneNumber });

      if (existPhone && existPhone.email !== email) {
        throw new BadRequestException("This phone already registered!");
      }
    }

    let userIsAlreadyExist = true;

    let user = await this.usersService.getByEmail({ email, relations: { userRoles: { role: true } } });
    let createdUserRole: UserRole | null = null;

    const role = await this.roleRepository.findOne({ where: { name: roleName } });

    if (!role) {
      throw new BadRequestException("Role does not exist!");
    }

    if (user) {
      const existingUserRole = user.userRoles.find((userRole) => userRole.role.name === roleName);

      if (existingUserRole) {
        throw new BadRequestException("User with this role already exists!");
      }

      createdUserRole = this.userRoleRepository.create({
        role,
        user,
      });
    } else {
      userIsAlreadyExist = false;

      user = await this.usersService.create({
        email,
        role: roleName,
        ...extraData,
      });

      createdUserRole = await this.helperService.getUserRoleByName(user, roleName);
    }

    createdUserRole.invitationLinkWasCreatedAt = new Date();
    createdUserRole.accountStatus = EAccountStatus.INVITATION_LINK;
    await this.userRoleRepository.save(createdUserRole);

    return { user, userIsAlreadyExist, createdUserRole };
  }

  public async generateRegistrationLink(
    email: string,
    userId: string,
    role: string,
    userIsAlreadyExist: boolean,
  ): Promise<{ registrationLink: string; linkDurationString: string }> {
    const invitationToken = await this.jwtRegistrationService.signAsync({
      email,
      userId,
      userRole: role,
      isInvitation: true,
      isOauth: false,
    } as IStartRegistrationSessionData);

    const linkDurationSeconds = this.configService.getOrThrow<number>("jwt.invitation.expirationTimeSeconds");
    const linkDurationString = `${linkDurationSeconds / NUMBER_OF_SECONDS_IN_DAY} days`;

    let registrationLink: string | null = null;

    if (userIsAlreadyExist) {
      registrationLink = `${this.configService.getOrThrow<string>("frontend.inviteForAlreadyRegisteredUserLink")}?${REGISTRATION_TOKEN_QUERY_PARAM}=${invitationToken}&${USER_ID_QUERY_PARAM}=${userId}&${ROLE_QUERY_PARAM}=${role}`;
    }

    if (!userIsAlreadyExist) {
      registrationLink = `${this.configService.getOrThrow<string>("frontend.inviteCompanySuperAdminRedirectionLink")}?${REGISTRATION_TOKEN_QUERY_PARAM}=${invitationToken}&${USER_ID_QUERY_PARAM}=${userId}&${ROLE_QUERY_PARAM}=${role}`;
    }

    if (!registrationLink) {
      throw new InternalServerErrorException("Link was not created");
    }

    return { registrationLink, linkDurationString };
  }

  private async handleUserRoleRecreation(
    dto: ResendRegistrationLinkDto,
    user: User,
    userRole: UserRole,
  ): Promise<User> {
    const { address, profile } = userRole;

    await this.userRepository.remove(user);
    user = await this.usersService.create({
      email: dto.email,
      phoneNumber: user.phoneNumber ?? null,
      role: dto.role,
    });

    const createdUserRole = await this.helperService.getUserRoleByName(user, dto.role);

    createdUserRole.invitationLinkWasCreatedAt = new Date();
    createdUserRole.accountStatus = EAccountStatus.INVITATION_LINK;

    if (address || profile) {
      createdUserRole.address = address;
      createdUserRole.profile = profile;
    }

    await this.userRoleRepository.save(createdUserRole);

    return user;
  }

  public async checkInvitationLinkTimeLimit(userRole: UserRole): Promise<void> {
    if (userRole.invitationLinkWasCreatedAt) {
      const MIN_TIME_LIMIT_MINUTES = 5;
      const minTimeLimit = MIN_TIME_LIMIT_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;

      const now = new Date();
      const timeSinceLastInvite = now.getTime() - userRole.invitationLinkWasCreatedAt.getTime();

      if (timeSinceLastInvite < minTimeLimit) {
        throw new BadRequestException(`Invitation link was sent less than ${MIN_TIME_LIMIT_MINUTES} minutes ago!`);
      }
    }

    return;
  }

  public async deleteRegistrationLinkById(id: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id },
      relations: { user: { userRoles: true }, role: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role with this id not found!");
    }

    if (!ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING.includes(userRole.accountStatus)) {
      throw new BadRequestException("User role with such account status cannot be deleted immediately!");
    }

    if (userRole.user.userRoles.length > 1) {
      await this.userRoleRepository.delete({ id: userRole.id });
    }

    if (userRole.user.userRoles.length <= 1) {
      await this.userRepository.delete({ id: userRole.userId });
    }

    return;
  }
}
