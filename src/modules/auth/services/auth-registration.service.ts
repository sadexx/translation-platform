import { Injectable } from "@nestjs/common";
import { RegistrationService } from "src/modules/auth/services";
import { User } from "src/modules/users/entities";
import { UsersService } from "src/modules/users/services";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { MultipleRolesLoginOutput, OneRoleLoginOutput, RegistrationOutput } from "src/modules/auth/common/outputs";
import { SessionsService } from "src/modules/sessions/services";
import { TokensService } from "src/modules/tokens/services";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users-roles/entities";
import { Company } from "src/modules/companies/entities";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { DeviceInfoDto } from "src/modules/auth/common/dto";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { IStartRegistrationSessionData } from "src/modules/auth/common/interfaces";
import { ERegistrableUserRoleName } from "src/modules/roles/common/enums";
import { ERegistrationStep } from "src/modules/auth/common/enums";
import { COMPANY_SUPER_ADMIN_ROLES } from "src/common/constants";
import { HelperService } from "src/modules/helper/services";
import { MessagingIdentityService } from "src/modules/chime-messaging-configuration/services";

@Injectable()
export class AuthRegistrationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly registrationService: RegistrationService,
    private readonly usersService: UsersService,
    private readonly userAvatarsService: UserAvatarsService,
    private readonly sessionsService: SessionsService,
    private readonly tokensService: TokensService,
    private readonly helperService: HelperService,
    private readonly messagingIdentityService: MessagingIdentityService,
  ) {}

  public async finishRegistration(dto: DeviceInfoDto, currentClient: ICurrentUserData): Promise<OneRoleLoginOutput> {
    const user = await this.usersService.getById({
      id: currentClient.id!,
      relations: { userRoles: { user: true, role: true }, administratedCompany: true },
    });
    const currentUserRole = await this.helperService.getUserRoleByName(user, currentClient.role);

    this.registrationService.checkRegistrationSteps(user, currentUserRole, currentClient.isOauth!);

    if (!user.isRegistrationFinished) {
      user.isRegistrationFinished = true;
      await this.userRepository.save(user);
    }

    await this.userRoleRepository.update(
      { id: currentUserRole.id },
      { isRegistrationFinished: true, accountStatus: EAccountStatus.REGISTERED },
    );

    if (COMPANY_SUPER_ADMIN_ROLES.includes(currentClient.role) && user.administratedCompany) {
      await this.companyRepository.update({ id: user.administratedCompany.id }, { status: ECompanyStatus.REGISTERED });
    }

    if (!user.avatarUrl) {
      await this.userAvatarsService.setDefaultUserAvatar(user.id);
    }

    await this.messagingIdentityService.createAppInstanceUser(currentUserRole);

    return await this.sessionsService.startSession({
      userId: currentClient.id!,
      userRoleId: currentUserRole.id,
      userRole: currentClient.role,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientIPAddress: currentClient.clientIPAddress!,
      clientUserAgent: currentClient.clientUserAgent!,
    });
  }

  public async manageRolesNumberAuth(
    user: User,
    currentClientData: ICurrentClientData,
  ): Promise<OneRoleLoginOutput | MultipleRolesLoginOutput> {
    if (user.userRoles.length === 1) {
      await this.usersService.isUserNotDeletedAndNotDeactivated(user.userRoles[0]);

      return await this.sessionsService.startSession({
        userId: user.id,
        userRoleId: user.userRoles[0].id,
        userRole: user.userRoles[0].role.name,
        isActive: user.userRoles[0].isActive,
        isRequiredInfoFulfilled: user.userRoles[0].isRequiredInfoFulfilled,
        platform: currentClientData.platform,
        deviceId: currentClientData.deviceId,
        deviceToken: currentClientData.deviceToken,
        iosVoipToken: currentClientData.iosVoipToken,
        clientUserAgent: currentClientData.userAgent,
        clientIPAddress: currentClientData.IPAddress,
      });
    }

    const roleSelectionToken = await this.tokensService.createRoleSelectionToken(user.id, currentClientData);

    return {
      availableRoles: this.usersService.flatUserRoles(user.userRoles),
      roleSelectionToken: roleSelectionToken,
    };
  }

  public async initializeOrContinueUserRegistration(
    user: User | null,
    registrationData: IStartRegistrationSessionData,
  ): Promise<RegistrationOutput | string> {
    const possibleRoles = Object.values(ERegistrableUserRoleName);
    const selectedUserRole = registrationData.userRole ?? user?.userRoles[0].role.name;

    if (!selectedUserRole || !possibleRoles.includes(selectedUserRole as unknown as ERegistrableUserRoleName)) {
      return `'Can't define user role. Provide "role" field. Possible roles: ${possibleRoles.join(", ")}`;
    }

    let existingUser: User | null = user;

    if (!existingUser) {
      existingUser = await this.usersService.create({
        email: registrationData.email,
        role: selectedUserRole,
      });
    }

    const userRole = existingUser.userRoles.find(({ role }) => role.name === selectedUserRole);

    if (!userRole) {
      await this.usersService.addNewUserRole({ userId: existingUser.id, role: selectedUserRole });
    }

    const registrationToken = await this.registrationService.startRegistrationSession({
      email: registrationData.email,
      userId: existingUser.id,
      userRole: registrationData.userRole,
      clientIPAddress: registrationData.clientIPAddress,
      clientUserAgent: registrationData.clientUserAgent,
      isOauth: registrationData.isOauth,
    });

    const registrationStep = !existingUser.phoneNumber
      ? ERegistrationStep.PHONE_VERIFICATION
      : ERegistrationStep.TERMS_AND_CONDITIONS_ACCEPTANCE;

    return { registrationToken, registrationStep };
  }
}
