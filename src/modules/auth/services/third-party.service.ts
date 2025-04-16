import { Injectable } from "@nestjs/common";
import { UsersService } from "src/modules/users/services";
import { AuthRegistrationService } from "src/modules/auth/services";
import { IThirdPartyAuthData } from "src/modules/auth/common/interfaces";
import { MultipleRolesLoginOutput, OneRoleLoginOutput, RegistrationOutput } from "src/modules/auth/common/outputs";

@Injectable()
export class ThirdPartyService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authRegistrationService: AuthRegistrationService,
  ) {}

  public async handleThirdPartyAuth(
    thirdPartyAuthData: IThirdPartyAuthData,
  ): Promise<RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput | string> {
    const user = await this.usersService.getByEmail({
      email: thirdPartyAuthData.email,
      relations: { userRoles: { role: true } },
    });

    if (user && user.userRoles.length > 1) {
      return await this.authRegistrationService.manageRolesNumberAuth(user, {
        platform: thirdPartyAuthData.platform,
        deviceId: thirdPartyAuthData.deviceId,
        deviceToken: thirdPartyAuthData.deviceToken,
        iosVoipToken: thirdPartyAuthData.iosVoipToken,
        IPAddress: thirdPartyAuthData.clientIPAddress,
        userAgent: thirdPartyAuthData.clientUserAgent,
      });
    }

    return await this.authRegistrationService.initializeOrContinueUserRegistration(user, {
      email: thirdPartyAuthData.email,
      userId: user?.id,
      userRole: thirdPartyAuthData.role,
      clientIPAddress: thirdPartyAuthData.clientIPAddress,
      clientUserAgent: thirdPartyAuthData.clientUserAgent,
      isOauth: true,
    });
  }
}
