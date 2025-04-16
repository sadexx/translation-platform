import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Response } from "express";
import { AppleMobileGuard, AppleWebGuard, GoogleMobileGuard, GoogleWebGuard } from "src/modules/auth/common/guards";
import { TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { EUserRoleName } from "src/modules/roles/common/enums";
import * as queryString from "querystring";
import { ThirdPartyService } from "src/modules/auth/services";
import { CurrentClient, CurrentUser } from "src/common/decorators";
import { ConfigService } from "@nestjs/config";
import {
  IAddPhoneData,
  IAppleWebUserData,
  IGoogleMobileUserData,
  IGoogleWebUserData,
  IThirdPartyAuthWebState,
} from "src/modules/auth/common/interfaces";
import { ThirdPartyAuthWebDto, ThirdPartyMobileAuthDto } from "src/modules/auth/common/dto";
import { ERegistrationStep } from "src/modules/auth/common/enums";
import { MultipleRolesLoginOutput, OneRoleLoginOutput, RegistrationOutput } from "src/modules/auth/common/outputs";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";

@Controller("auth")
export class ThirdPartyAuthController {
  constructor(
    private readonly thirdPartyService: ThirdPartyService,
    private readonly configService: ConfigService,
  ) {}

  @Get("google")
  async googleAuth(
    @Res() res: Response,
    @CurrentClient() currentClient: ICurrentClientData,
    @Query() dto: ThirdPartyAuthWebDto,
  ): Promise<void> {
    const authRedirection = this.configService.getOrThrow<string>("googleAuth.callbackURL");
    const googleOauth2ClientId = this.configService.getOrThrow<string>("googleAuth.clientID");

    const state = JSON.stringify({
      role: dto.role as unknown as EUserRoleName,
      ...currentClient,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
    } as IThirdPartyAuthWebState);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${queryString.stringify({
      client_id: googleOauth2ClientId,
      redirect_uri: authRedirection,
      response_type: "code",
      scope: "email profile",
      state,
    })}`;

    res.redirect(authUrl);
  }

  @Get("google-redirect")
  @UseGuards(GoogleWebGuard)
  async googleRedirect(@CurrentUser() googleWebUserData: IGoogleWebUserData, @Res() res: Response): Promise<void> {
    const result = await this.thirdPartyService.handleThirdPartyAuth(googleWebUserData);

    this.handleWebOauthRedirect(result, res);
  }

  @Post("google-mobile")
  @UseGuards(GoogleMobileGuard)
  @UseInterceptors(TokensInterceptor)
  async googleMobile(
    @CurrentUser() googleMobileUserData: IGoogleMobileUserData,
    @CurrentClient() currentClient: ICurrentClientData,
    @Body() dto: ThirdPartyMobileAuthDto,
  ): Promise<RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput> {
    const result = await this.thirdPartyService.handleThirdPartyAuth({
      email: googleMobileUserData.email,
      fullName: googleMobileUserData.fullName,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientUserAgent: currentClient.userAgent,
      clientIPAddress: currentClient.IPAddress,
      role: dto.role,
    });

    if (typeof result === "string") {
      throw new BadRequestException(result);
    }

    return result;
  }

  @Get("apple")
  async appleAuth(
    @Res() res: Response,
    @CurrentClient() currentClient: ICurrentClientData,
    @Query() dto: ThirdPartyAuthWebDto,
  ): Promise<void> {
    const authRedirection = this.configService.getOrThrow<string>("appleAuth.callbackURL");
    const appleOauth2ClientId = this.configService.getOrThrow<string>("appleAuth.clientID");

    const state = JSON.stringify({
      role: dto.role as unknown as EUserRoleName,
      ...currentClient,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
    } as IThirdPartyAuthWebState);

    const authUrl = `https://appleid.apple.com/auth/authorize?${queryString.stringify({
      client_id: appleOauth2ClientId,
      redirect_uri: authRedirection,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: "email name",
      state,
    })}`;

    res.redirect(authUrl);
  }

  @Post("apple-redirect")
  @UseGuards(AppleWebGuard)
  async appleRedirect(@CurrentUser() appleWebUserData: IAppleWebUserData, @Res() res: Response): Promise<void> {
    const result = await this.thirdPartyService.handleThirdPartyAuth(appleWebUserData);

    this.handleWebOauthRedirect(result, res);
  }

  @Post("apple-mobile")
  @UseGuards(AppleMobileGuard)
  @UseInterceptors(TokensInterceptor)
  async appleMobileLogin(
    @CurrentUser() currentUser: IAddPhoneData,
    @CurrentClient() currentClient: ICurrentClientData,
    @Body() dto: ThirdPartyMobileAuthDto,
  ): Promise<RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput> {
    const result = await this.thirdPartyService.handleThirdPartyAuth({
      email: currentUser.email,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.IPAddress,
      role: dto.role,
    });

    if (typeof result === "string") {
      throw new BadRequestException(result);
    }

    return result;
  }

  private handleWebOauthRedirect(
    thirdPartyAuthResult: RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput | string,
    res: Response,
  ): void {
    let redirectUri = this.configService.getOrThrow<string>("frontend.uri");

    if (typeof thirdPartyAuthResult === "string") {
      redirectUri += "/signup";
    } else if ("registrationToken" in thirdPartyAuthResult) {
      res.cookie("registrationToken", thirdPartyAuthResult.registrationToken);

      if (thirdPartyAuthResult.registrationStep === ERegistrationStep.PHONE_VERIFICATION) {
        redirectUri += "/signup/step/phone";
      } else {
        redirectUri += "/signup/agreements";
      }
    } else if ("roleSelectionToken" in thirdPartyAuthResult) {
      const availableRoles = thirdPartyAuthResult.availableRoles;
      const rolesParams = availableRoles.map((role) => `roles=${encodeURIComponent(role)}`).join("&");

      res.cookie("roleSelectionToken", thirdPartyAuthResult.roleSelectionToken);
      redirectUri += "/login/role-selection" + `?${rolesParams}`;
    } else {
      res.cookie("accessToken", thirdPartyAuthResult.accessToken);
      res.cookie("refreshToken", thirdPartyAuthResult.refreshToken);
      redirectUri += "/login" + "?withTokens=true";
    }

    res.redirect(redirectUri);
  }
}
