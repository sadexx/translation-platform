import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AbnService } from "src/modules/abn/services";
import { GetCompanyByAbnDto, GetCompanyStatusDto, GetUserByAbnDto } from "src/modules/abn/common/dto";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { AbnCheck } from "src/modules/abn/entities";
import { IAbnVerificationResponse } from "src/modules/abn/common/interface";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("abn")
export class AbnController {
  constructor(private readonly abnService: AbnService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("verify-individual-abn-status")
  async getIndividualAbnVerificationStatus(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: GetUserByAbnDto,
  ): Promise<IAbnVerificationResponse> {
    return this.abnService.getIndividualAbnVerificationStatus(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("verify-corporate-abn-status")
  async getCorporateAbnVerificationStatus(
    @CurrentUser() user: ITokenUserData,
    @Query() { abn, companyId, isGstPayer }: GetCompanyByAbnDto,
  ): Promise<IAbnVerificationResponse> {
    return this.abnService.getCorporateAbnVerificationStatus(user, abn, isGstPayer, companyId);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("user-status")
  async getUserStatus(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<AbnCheck | null> {
    return this.abnService.getUserStatus(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("company-status")
  async getCompanyStatus(
    @Query() { companyId }: GetCompanyStatusDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<AbnCheck | undefined> {
    return this.abnService.getCompanyStatus(user, companyId);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAbnCheck(@Query() { id }: UUIDParamDto): Promise<void> {
    return await this.abnService.removeAbnCheck(id);
  }
}
