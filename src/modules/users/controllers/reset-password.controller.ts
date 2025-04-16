import { Body, Controller, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ResetPasswordService } from "src/modules/users/services";
import { JwtResetPasswordGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ResetPasswordDto, StartPasswordResetDto, VerifyPasswordResetCodeDto } from "src/modules/users/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("users")
export class ResetPasswordController {
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  @Post("password-reset-requests")
  async startPasswordReset(
    @Req() { clientInfo }: Request,
    @Body() startPasswordResetDto: StartPasswordResetDto,
  ): Promise<void> {
    return this.resetPasswordService.sendRequestToChangePassword({
      identification: startPasswordResetDto.identification,
      clientUserAgent: clientInfo.userAgent,
      clientIPAddress: clientInfo.IPAddress,
    });
  }

  @Post("password-reset-requests/verification")
  async verifyPasswordResetCode(
    @Req() { clientInfo }: Request,
    @Body() { phone, code }: VerifyPasswordResetCodeDto,
  ): Promise<string> {
    return this.resetPasswordService.verifyPasswordResetCode({
      phone,
      code,
      clientUserAgent: clientInfo.userAgent,
      clientIPAddress: clientInfo.IPAddress,
    });
  }

  @Patch("password")
  @UseGuards(JwtResetPasswordGuard)
  async changePassword(@CurrentUser() user: ITokenUserData, @Body() { newPassword }: ResetPasswordDto): Promise<void> {
    return this.resetPasswordService.changePassword(user, newPassword);
  }
}
