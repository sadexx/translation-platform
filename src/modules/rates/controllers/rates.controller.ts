import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RatesService } from "src/modules/rates/services";
import {
  CalculatePriceDto,
  GenerateRateTableDto,
  GetRateTableDto,
  UpdateRateTableDto,
} from "src/modules/rates/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ICalculatePriceGetPrice, IConvertedRate } from "src/modules/rates/common/interfaces";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("rates")
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("generate-rate-table")
  async generateRateTable(@Body() dto: GenerateRateTableDto): Promise<Partial<IConvertedRate>[]> {
    return await this.ratesService.generateRateTable(dto.interpreterType, dto.onDemandAudioStandardFirst);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rate-table")
  async getRateTable(@Query() dto: GetRateTableDto, @CurrentUser() user: ITokenUserData): Promise<IConvertedRate[]> {
    return await this.ratesService.getRateTable(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("update-rate-table")
  async updateRateTable(@Body() dto: UpdateRateTableDto): Promise<void> {
    return await this.ratesService.updateRateTable(dto);
  }

  @Post("calculate-price")
  async calculatePrice(@Body() dto: CalculatePriceDto): Promise<ICalculatePriceGetPrice> {
    return await this.ratesService.calculatePrice(dto);
  }
}
