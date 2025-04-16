import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { PromoCampaignsCreationService, PromoCampaignsManagementService } from "src/modules/promo-campaigns/services";
import {
  CreateCorporateMixedPromo,
  CreateCorporatePromoCampaignDto,
  CreatePersonalMixedPromo,
  CreatePersonalPromoCampaignDto,
  GetAllCorporatePromoCampaignsDto,
  GetAllPersonalPromoCampaignsDto,
  PromoCampaignAssignmentDto,
} from "src/modules/promo-campaigns/common/dto";
import { GetAllPromoCampaignsOutput } from "src/modules/promo-campaigns/common/outputs";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UUIDParamDto } from "src/common/dto";

@Controller("promo-campaigns")
export class PromoCampaignsController {
  constructor(
    private readonly promoCampaignsManagementService: PromoCampaignsManagementService,
    private readonly promoCampaignsCreationService: PromoCampaignsCreationService,
  ) {}

  @Get("personal")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getPersonalPromoCampaigns(@Query() dto: GetAllPersonalPromoCampaignsDto): Promise<GetAllPromoCampaignsOutput> {
    return this.promoCampaignsManagementService.getPersonalPromoCampaigns(dto);
  }

  @Get("corporate")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getCorporatePromoCampaigns(
    @Query() dto: GetAllCorporatePromoCampaignsDto,
  ): Promise<GetAllPromoCampaignsOutput> {
    return this.promoCampaignsManagementService.getCorporatePromoCampaigns(dto);
  }

  @Post("personal")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createPersonalPromoCampaign(@Body() dto: CreatePersonalPromoCampaignDto): Promise<PromoCampaign> {
    return this.promoCampaignsCreationService.createPersonalPromoCampaign(dto);
  }

  @Post("personal/mixed")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createPersonalMixedPromoCampaign(@Body() dto: CreatePersonalMixedPromo): Promise<PromoCampaign> {
    return this.promoCampaignsCreationService.createPersonalMixedPromoCampaign(dto);
  }

  @Post("corporate")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createCorporatePromoCampaign(@Body() dto: CreateCorporatePromoCampaignDto): Promise<PromoCampaign> {
    return this.promoCampaignsCreationService.createCorporatePromoCampaign(dto);
  }

  @Post("corporate/mixed")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createCorporateMixedPromoCampaign(@Body() dto: CreateCorporateMixedPromo): Promise<PromoCampaign> {
    return this.promoCampaignsCreationService.createCorporateMixedPromoCampaign(dto);
  }

  @Patch("assign")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async assignPersonalPromoCampaign(
    @Body() dto: PromoCampaignAssignmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.promoCampaignsManagementService.assignPersonalPromoCampaign(dto, user);
  }

  @Patch("unassign")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async unassignPersonalPromoCampaign(
    @Body() dto: PromoCampaignAssignmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.promoCampaignsManagementService.unassignPersonalPromoCampaign(dto, user);
  }

  @Patch("toggle-status/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async togglePromoCampaignStatus(@Param() { id }: UUIDParamDto): Promise<void> {
    return this.promoCampaignsManagementService.togglePromoCampaignStatus(id);
  }

  @Delete(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async removePromoCampaign(@Param() { id }: UUIDParamDto): Promise<void> {
    return this.promoCampaignsManagementService.removePromoCampaign(id);
  }
}
