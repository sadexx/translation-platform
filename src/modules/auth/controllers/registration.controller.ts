import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  AddPhoneNumber,
  CreatePasswordDto,
  DeviceInfoDto,
  GetRegistrationLinkDto,
  RegisterUserDto,
  SelectRoleDto,
  SuperAdminRegistrationDto,
  VerifyEmail,
  VerifyPhoneNumberDto,
} from "src/modules/auth/common/dto";
import { CurrentClient, CurrentUser } from "src/common/decorators";
import {
  JwtEmailConfirmationGuard,
  JwtRegistrationGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
} from "src/modules/auth/common/guards";
import { UsersService } from "src/modules/users/services";
import { RegistrationService } from "src/modules/auth/services";
import { TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { IInvitedCurrentUserData } from "src/modules/auth/common/interfaces";
import { AuthRegistrationService } from "src/modules/auth/services/auth-registration.service";
import {
  EmailConfirmationTokenOutput,
  OneRoleLoginOutput,
  RegistrationStepsOutput,
  RegistrationTokenOutput,
} from "src/modules/auth/common/outputs";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("registration")
export class RegistrationController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly usersService: UsersService,
  ) {}

  @Post("start-registration")
  @UseInterceptors(TokensInterceptor)
  async startRegistration(
    @Body() dto: RegisterUserDto,
    @CurrentClient() clientInfo: ICurrentClientData,
  ): Promise<EmailConfirmationTokenOutput> {
    return await this.registrationService.startRegistration({
      ...dto,
      IPAddress: clientInfo.IPAddress,
      userAgent: clientInfo.userAgent,
    });
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("start-new-role-registration")
  @UseInterceptors(TokensInterceptor)
  async startNewRoleRegistration(
    @Body() dto: SelectRoleDto,
    @CurrentUser() user: ICurrentUserData,
  ): Promise<RegistrationTokenOutput> {
    const registrationToken = await this.registrationService.startNewRoleRegistration({
      user: user,
      role: dto.role,
    });

    return { registrationToken };
  }

  @UseGuards(JwtEmailConfirmationGuard)
  @Post("verify-email")
  @UseInterceptors(TokensInterceptor)
  async verifyEmail(
    @Body() dto: VerifyEmail,
    @CurrentUser() user: ICurrentUserData,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<RegistrationTokenOutput> {
    const registrationToken = await this.registrationService.verifyEmail({
      ...dto,
      email: user.email,
      role: user.role,
      isInvitation: user.isInvitation,
      IPAddress: currentClient.IPAddress,
      userAgent: currentClient.userAgent,
    });

    return { registrationToken };
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("create-password")
  async createPassword(
    @Body() dto: CreatePasswordDto,
    @Query() query: GetRegistrationLinkDto,
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserData,
  ): Promise<MessageOutput> {
    return this.registrationService.createPassword(
      {
        ...dto,
        email: user.email,
      },
      query,
    );
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("add-phone")
  async addPhone(
    @Body() dto: AddPhoneNumber,
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserData,
  ): Promise<MessageOutput> {
    if (user.isInvitation) {
      await this.usersService.update(user.id!, { isEmailVerified: true });
    }

    return this.registrationService.sendPhoneNumberVerificationCode({
      ...dto,
      email: user.email,
      role: user.role,
    });
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("verify-phone")
  async verifyPhone(
    @Body() dto: VerifyPhoneNumberDto,
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserData,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<MessageOutput> {
    return this.registrationService.verifyPhoneNumber({
      ...dto,
      email: user.email,
      role: user.role,
      isInvitation: user.isInvitation,
      IPAddress: currentClient.IPAddress,
      userAgent: currentClient.userAgent,
    });
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("conditions-agreement")
  async conditionsAgreement(
    @Query() query: GetRegistrationLinkDto,
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserData,
  ): Promise<MessageOutput> {
    return this.registrationService.agreeToConditions(user.id!, user.role, query);
  }

  @UseGuards(JwtRegistrationGuard)
  @Get("steps")
  async getRegistrationSteps(
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserData,
  ): Promise<RegistrationStepsOutput> {
    return this.registrationService.retrieveRegistrationSteps({
      userId: user.id!,
      role: user.role,
      isOauth: Boolean(user.isOauth),
      isAdditionalRole: Boolean(user.isAdditionalRole),
      isInvitation: Boolean(user.isInvitation),
    });
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("finish-registration")
  @UseInterceptors(TokensInterceptor)
  async finishRegistration(
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserData,
    @CurrentClient() currentClient: ICurrentClientData,
    @Body() dto: DeviceInfoDto,
  ): Promise<OneRoleLoginOutput> {
    return this.authRegistrationService.finishRegistration(dto, {
      ...user,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });
  }

  @Post("super-admin-registration")
  async startSuperAdminRegistration(
    @Body() dto: SuperAdminRegistrationDto,
    @CurrentClient() clientInfo: ICurrentClientData,
  ): Promise<MessageOutput> {
    return this.registrationService.startSuperAdminRegistration(dto.email, clientInfo.IPAddress, clientInfo.userAgent);
  }
}
