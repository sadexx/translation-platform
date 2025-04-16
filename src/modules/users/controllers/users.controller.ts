import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "src/modules/users/services";
import { CurrentUser } from "src/common/decorators";
import {
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  JwtRestorationGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import {
  ChangeEmailDto,
  ChangePasswordDto,
  ChangePhoneNumberDto,
  DeleteByRoleIdRequestDto,
  RestoreUserDto,
  VerifyEmailDto,
  VerifyPhoneNumberDto,
} from "src/modules/users/common/dto";
import { UserGetOutput } from "src/modules/users/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("users/me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get()
  async getUser(@CurrentUser() user: ITokenUserData): Promise<UserGetOutput> {
    return await this.usersService.getById({ id: user.id, relations: { userRoles: { role: true } } });
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("delete-by-id-request")
  public async deleteById(
    @Query() { userRoleId }: DeleteByRoleIdRequestDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.usersService.deleteUserRequest(userRoleId, user);
  }

  @UseGuards(JwtRestorationGuard)
  @Post("restore-user")
  public async restoreUser(@Body() { restorationKey }: RestoreUserDto): Promise<void> {
    return await this.usersService.restoreUserAccount(restorationKey);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("change-registered-phone")
  async changeRegisteredPhone(
    @Body() dto: ChangePhoneNumberDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.usersService.sendNewPhoneNumberVerificationCode(dto.phoneNumber, user.id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Patch("verify-new-phone")
  async verifyNewPhone(@Body() dto: VerifyPhoneNumberDto, @CurrentUser() user: ITokenUserData): Promise<MessageOutput> {
    return await this.usersService.verifyNewPhoneNumberCode(dto.verificationCode, user.id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("change-registered-email")
  async changeRegisteredEmail(@Body() dto: ChangeEmailDto): Promise<MessageOutput> {
    return await this.usersService.sendNewEmailVerificationCode(dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Patch("verify-new-email")
  async verifyNewEmail(@Body() dto: VerifyEmailDto, @CurrentUser() user: ITokenUserData): Promise<MessageOutput> {
    return await this.usersService.verifyNewEmailCode(dto.email, dto.verificationCode, user.id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Patch("change-registered-password")
  async changeRegisteredPassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.usersService.changeRegisteredPassword(dto, user.id);
  }
}
