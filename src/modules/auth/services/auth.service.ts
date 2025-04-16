import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IChangeUserRoleData, ILoginUserData, ISelectRoleData } from "src/modules/auth/common/interfaces";
import { UsersService } from "src/modules/users/services";
import { SessionsService } from "src/modules/sessions/services";
import { UsersRolesService } from "src/modules/users-roles/services";
import { MultipleRolesLoginOutput, OneRoleLoginOutput, RegistrationOutput } from "src/modules/auth/common/outputs";
import { DeviceInfoDto } from "src/modules/auth/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AuthRegistrationService } from "./auth-registration.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRolesService: UsersRolesService,
    private readonly sessionsService: SessionsService,
    private readonly authRegistrationService: AuthRegistrationService,
  ) {}

  public async login(
    loginUserData: ILoginUserData,
  ): Promise<OneRoleLoginOutput | MultipleRolesLoginOutput | RegistrationOutput | string> {
    const user = await this.usersService.verifyUser(loginUserData.identification, loginUserData.password);

    if (user.userRoles.length === 1 && !user.userRoles[0].isRegistrationFinished) {
      return this.authRegistrationService.initializeOrContinueUserRegistration(user, {
        email: user.email,
        userId: user.id,
        userRole: user.userRoles[0].role.name,
        clientIPAddress: loginUserData.IPAddress,
        clientUserAgent: loginUserData.userAgent,
        isOauth: false,
      });
    }

    return await this.authRegistrationService.manageRolesNumberAuth(user, {
      platform: loginUserData.platform,
      deviceId: loginUserData.deviceId,
      deviceToken: loginUserData.deviceToken,
      iosVoipToken: loginUserData.iosVoipToken,
      userAgent: loginUserData.userAgent,
      IPAddress: loginUserData.IPAddress,
    });
  }

  public async refreshTokens(currentUserData: ITokenUserData, dto: DeviceInfoDto): Promise<OneRoleLoginOutput> {
    const user = await this.usersService.getById({ id: currentUserData.id, relations: { userRoles: { role: true } } });
    const specifiedRole = user.userRoles.find(({ role }) => role.name === currentUserData.role);

    if (!specifiedRole) {
      throw new ForbiddenException("You don't have an account associated with such role");
    }

    await this.usersService.isUserNotDeletedAndNotDeactivated(specifiedRole);

    return await this.sessionsService.updateActiveSession({
      userId: currentUserData.id,
      userRoleId: specifiedRole.id,
      userRole: currentUserData.role,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientIPAddress: currentUserData.clientIPAddress,
      clientUserAgent: currentUserData.clientUserAgent,
      isActive: specifiedRole.isActive,
      isRequiredInfoFulfilled: specifiedRole.isRequiredInfoFulfilled,
    });
  }

  public async selectRole(selectRoleData: ISelectRoleData): Promise<OneRoleLoginOutput | RegistrationOutput | string> {
    const user = await this.usersService.getById({
      id: selectRoleData.userId,
      relations: { userRoles: { role: true } },
    });
    const availableUserRoles = this.usersService.flatUserRoles(user.userRoles);

    if (!availableUserRoles.includes(selectRoleData.role)) {
      throw new ForbiddenException("You don't have an account associated with such role");
    }

    const selectedRole = user.userRoles.find(({ role }) => role.name === selectRoleData.role);

    if (!selectedRole) {
      throw new ForbiddenException("You don't have an account associated with such role");
    }

    if (!selectedRole.isRegistrationFinished) {
      return await this.authRegistrationService.initializeOrContinueUserRegistration(user, {
        email: user.email,
        userId: user.id,
        userRole: selectRoleData.role,
        clientIPAddress: selectRoleData.IPAddress,
        clientUserAgent: selectRoleData.userAgent,
        isOauth: false,
      });
    }

    await this.usersService.isUserNotDeletedAndNotDeactivated(selectedRole);

    return await this.sessionsService.startSession({
      userId: user.id,
      userRoleId: selectedRole.id,
      userRole: selectRoleData.role,
      isActive: selectedRole.isActive,
      isRequiredInfoFulfilled: selectedRole.isRequiredInfoFulfilled,
      platform: selectRoleData.platform,
      deviceId: selectRoleData.deviceId,
      deviceToken: selectRoleData.deviceToken,
      iosVoipToken: selectRoleData.iosVoipToken,
      clientUserAgent: selectRoleData.userAgent,
      clientIPAddress: selectRoleData.IPAddress,
    });
  }

  public async changeRole(
    changeUserRoleData: IChangeUserRoleData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput | string> {
    const userRole = await this.usersRolesService.getByUserIdAndRoleName(
      changeUserRoleData.user.id!,
      changeUserRoleData.role,
      { role: true, user: { userRoles: { role: true } } },
    );

    if (changeUserRoleData.role === changeUserRoleData.user.role) {
      throw new BadRequestException("User is already using this role");
    }

    if (!userRole.isRegistrationFinished) {
      return await this.authRegistrationService.initializeOrContinueUserRegistration(userRole.user, {
        email: userRole.user.email,
        userId: userRole.user.id,
        userRole: userRole.role.name,
        clientIPAddress: changeUserRoleData.user.clientIPAddress,
        clientUserAgent: changeUserRoleData.user.clientUserAgent,
        isOauth: false,
      });
    }

    await this.usersService.isUserNotDeletedAndNotDeactivated(userRole);

    return await this.sessionsService.startSession({
      userId: changeUserRoleData.user.id!,
      userRoleId: userRole.id,
      userRole: changeUserRoleData.role,
      isActive: userRole.isActive,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
      platform: changeUserRoleData.platform,
      deviceId: changeUserRoleData.deviceId,
      deviceToken: changeUserRoleData.deviceToken,
      iosVoipToken: changeUserRoleData.iosVoipToken,
      clientUserAgent: changeUserRoleData.user.clientUserAgent!,
      clientIPAddress: changeUserRoleData.user.clientIPAddress!,
    });
  }

  public async logout(user: ITokenUserData): Promise<OneRoleLoginOutput> {
    const session = await this.sessionsService.getLast(user.id);

    if (!session) {
      throw new NotFoundException("Can't find session with such refresh token");
    }

    await this.sessionsService.deleteCurrentSession(session);

    return {
      accessToken: "",
      refreshToken: "",
    };
  }
}
