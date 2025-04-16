import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { ToolboxService } from "src/modules/toolbox/services";
import { Company } from "src/modules/companies/entities";
import { User } from "src/modules/users/entities";
import { GetDropdownCompaniesDto, GetDropdownUsersDto } from "src/modules/toolbox/common/dto";
import {
  GetActiveAndInactiveLanguagesOutput,
  GetInterpreterAvailabilityOutput,
} from "src/modules/toolbox/common/outputs";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("toolbox")
export class ToolboxController {
  constructor(private readonly toolboxService: ToolboxService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("language-availability")
  public async getActiveAndInactiveLanguages(): Promise<GetActiveAndInactiveLanguagesOutput> {
    return await this.toolboxService.getLanguagesAvailability();
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("companies-dropdown-information")
  public async getDropdownCompanies(@Query() dto: GetDropdownCompaniesDto): Promise<Company[]> {
    return await this.toolboxService.getDropdownCompanies(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("users-dropdown-information")
  public async getDropdownUsers(
    @Query() dto: GetDropdownUsersDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<User[]> {
    return await this.toolboxService.getDropdownUsers(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("interpreters-availability")
  public async getInterpretersAvailabilityCounts(
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetInterpreterAvailabilityOutput> {
    return await this.toolboxService.getInterpretersAvailability(user);
  }
}
