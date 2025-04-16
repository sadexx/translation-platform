import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import {
  CreateLanguagePairDto,
  CustomInsuranceDto,
  SetInterpreterOnlineDto,
  UpdateInterpreterProfileDto,
} from "src/modules/interpreter-profile/common/dto";
import { CustomInsurance, InterpreterProfile, LanguagePair } from "src/modules/interpreter-profile/entities";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { NotEmptyBodyPipe } from "src/common/pipes";

@Controller("interpreter-profile")
export class InterpreterProfileController {
  constructor(private readonly interpreterProfileService: InterpreterProfileService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get()
  async getInterpreterProfile(@CurrentUser() user: ITokenUserData): Promise<InterpreterProfile> {
    return this.interpreterProfileService.getInterpreterProfile(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("/language-pairs")
  async getLanguagePairs(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<LanguagePair[] | null> {
    return this.interpreterProfileService.getLanguagePairs(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("/language-pairs")
  async createLanguagePairs(@CurrentUser() user: ITokenUserData, @Body() dto: CreateLanguagePairDto): Promise<void> {
    return this.interpreterProfileService.createLanguagePairs(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("/set-custom-insurance")
  async setCustomInsurance(@CurrentUser() user: ITokenUserData, @Body() dto: CustomInsuranceDto): Promise<void> {
    return this.interpreterProfileService.setCustomInsurance(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("/get-custom-insurance")
  async getCustomInsurance(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<CustomInsurance | null> {
    return this.interpreterProfileService.getCustomInsurance(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-custom-insurance")
  async removePteCheckFile(@Query() { id }: UUIDParamDto): Promise<void> {
    return this.interpreterProfileService.removeCustomInsurance(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch()
  async updateInterpreterProfile(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: UpdateInterpreterProfileDto,
  ): Promise<MessageOutput> {
    return await this.interpreterProfileService.updateInterpreterProfile(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch("update-online-status")
  async setInterpreterOnline(@CurrentUser() user: ITokenUserData, @Body() dto: SetInterpreterOnlineDto): Promise<void> {
    return await this.interpreterProfileService.updateInterpreterOnlineStatus(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("set-offline-status")
  async setInterpreterOffline(@CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.interpreterProfileService.setInterpreterOffline(user);
  }
}
