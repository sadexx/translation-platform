import { Injectable } from "@nestjs/common";
import { JwtRequiredInfoAccessService } from "src/modules/tokens/common/libs/required-info-access-token/jwt-required-info-access.service";
import { JwtRequiredInfoRefreshService } from "src/modules/tokens/common/libs/required-info-refresh-token/jwt-required-info-refresh.service";
import { JwtActivationAccessService } from "src/modules/tokens/common/libs/activation-access-token";
import { JwtActivationRefreshService } from "src/modules/tokens/common/libs/activation-refresh-token";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { JwtRefreshService } from "src/modules/tokens/common/libs/refresh-token";
import { JwtRoleSelectionService } from "src/modules/tokens/common/libs/role-selection-token";
import { ICreateTokensData } from "src/modules/auth/common/interfaces";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtRequiredInfoAccessService: JwtRequiredInfoAccessService,
    private readonly jwtRequiredInfoRefreshService: JwtRequiredInfoRefreshService,
    private readonly jwtActivationAccessService: JwtActivationAccessService,
    private readonly jwtActivationRefreshService: JwtActivationRefreshService,
    private readonly jwtAccessService: JwtAccessService,
    private readonly jwtRefreshService: JwtRefreshService,
    private readonly jwtRoleSelectionService: JwtRoleSelectionService,
  ) {}

  public async createRequiredInfoTokens(data: ICreateTokensData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtRequiredInfoAccessService.signAsync(data);
    const refreshToken = await this.jwtRequiredInfoRefreshService.signAsync(data);

    return { accessToken, refreshToken };
  }

  public async createActivationTokens(data: ICreateTokensData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtActivationAccessService.signAsync(data);
    const refreshToken = await this.jwtActivationRefreshService.signAsync(data);

    return { accessToken, refreshToken };
  }

  public async createFullAccessTokens(data: ICreateTokensData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtAccessService.signAsync(data);
    const refreshToken = await this.jwtRefreshService.signAsync(data);

    return { accessToken, refreshToken };
  }

  public async createRoleSelectionToken(userId: string, currentClientData: ICurrentClientData): Promise<string> {
    return await this.jwtRoleSelectionService.signAsync({
      userId,
      platform: currentClientData.platform,
      deviceId: currentClientData.deviceId,
      deviceToken: currentClientData.deviceToken,
      iosVoipToken: currentClientData.iosVoipToken,
      IPAddress: currentClientData.IPAddress,
      userAgent: currentClientData.userAgent,
    });
  }
}
