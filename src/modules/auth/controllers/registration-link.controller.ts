import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { RegistrationLinkService } from "src/modules/auth/services";
import { ResendRegistrationLinkDto, SendRegistrationLinkDto } from "src/modules/auth/common/dto";
import { RegistrationLinkOutput } from "src/modules/auth/common/outputs";
import { UUIDParamDto } from "src/common/dto";

@Controller("registration-link")
export class RegistrationLinkController {
  constructor(private readonly registrationLinkService: RegistrationLinkService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post()
  async sendRegistrationLink(@Body() dto: SendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    return await this.registrationLinkService.sendRegistrationLink(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("resend")
  async resendRegistrationLink(@Body() dto: ResendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    return await this.registrationLinkService.resendRegistrationLink(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("delete-by-id/:id")
  public async deleteById(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.registrationLinkService.deleteRegistrationLinkById(id);
  }
}
