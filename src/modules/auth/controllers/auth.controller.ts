import { Body, Controller, Post, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { Request, Response } from "express";
import { IRequestWithRefreshToken } from "src/modules/auth/common/interfaces";
import { ChangeRoleDto, LoginDto, RefreshTokensDto, SelectRoleDto } from "src/modules/auth/common/dto";
import { CurrentUser } from "src/common/decorators";
import {
  JwtRefreshGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  JwtRoleSelectionGuard,
} from "src/modules/auth/common/guards";
import { TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { AuthService } from "src/modules/auth/services";
import { MultipleRolesLoginOutput, OneRoleLoginOutput, RegistrationOutput } from "src/modules/auth/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseInterceptors(TokensInterceptor)
  async login(
    @Req() req: Request,
    @Body() dto: LoginDto,
  ): Promise<OneRoleLoginOutput | MultipleRolesLoginOutput | RegistrationOutput | string> {
    return this.authService.login({
      ...dto,
      IPAddress: req.clientInfo.IPAddress,
      userAgent: req.clientInfo.userAgent,
    });
  }

  @UseGuards(JwtRoleSelectionGuard)
  @Post("login/select-role")
  @UseInterceptors(TokensInterceptor)
  async selectRole(
    @Req() req: Request,
    @Body() dto: SelectRoleDto,
    @CurrentUser() user: ICurrentUserData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput | string> {
    return this.authService.selectRole({
      userId: req.user.id,
      role: dto.role,
      platform: user.platform!,
      deviceId: user.deviceId!,
      deviceToken: user.deviceToken!,
      iosVoipToken: user.iosVoipToken!,
      IPAddress: req.clientInfo.IPAddress,
      userAgent: req.clientInfo.userAgent,
    });
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("login/change-role")
  @UseInterceptors(TokensInterceptor)
  async changeRole(
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: ICurrentUserData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput | string> {
    return await this.authService.changeRole({
      user: user,
      role: dto.role,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
    });
  }

  @Post("refresh-tokens")
  @UseGuards(JwtRefreshGuard)
  @UseInterceptors(TokensInterceptor)
  async refreshTokens(
    @Req() _req: IRequestWithRefreshToken,
    @CurrentUser() user: ITokenUserData,
    @Body() dto: RefreshTokensDto,
  ): Promise<OneRoleLoginOutput> {
    return await this.authService.refreshTokens(user, dto);
  }

  @Post("logout")
  @UseGuards(JwtRefreshGuard)
  @UseInterceptors(TokensInterceptor)
  async logout(
    @Req() _req: IRequestWithRefreshToken,
    @CurrentUser() user: ITokenUserData,
    @Res() res: Response,
  ): Promise<Response> {
    const logoutResult = await this.authService.logout(user);

    res.cookie("accessToken", "", { expires: new Date(0), httpOnly: true, secure: true });
    res.cookie("refreshToken", "", { expires: new Date(0), httpOnly: true, secure: true });

    return res.json(logoutResult);
  }
}
