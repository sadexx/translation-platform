import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { IndividualStatisticsService } from "src/modules/statistics/services";
import {
  IChartHomepageLineData,
  IChartLineData,
  IChartRoundData,
  IGetHomepageBaseAppointmentStatistic,
} from "src/modules/statistics/common/interfaces";
import {
  GetAppointmentsByInterpretingTypeAndClientDto,
  GetAppointmentsByLanguageAndClientDto,
  GetAppointmentsWithoutInterpreterByClientDto,
  GetCancelledAppointmentsByClientDto,
  GetCompletedAppointmentByTypeAndInterpreterDto,
  GetCreatedVsCompletedAppointmentsByTypeAndClientDto,
  GetEarnedMoneyByInterpreterDto,
  GetHomepageBaseAppointmentStatisticDto,
  GetSpentCostByClient,
} from "src/modules/statistics/common/dto";

@Controller("statistics/individual")
export class IndividualStatisticsController {
  constructor(private readonly individualStatisticsService: IndividualStatisticsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-type-and-client")
  async getCreatedVsCompletedAppointmentsByTypeAndCompanyAndClient(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndClientDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getCreatedVsCompletedAppointmentsByTypeAndClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-language-and-client")
  async getCreatedVsCompletedAppointmentsByLanguageAndCompanyAndClient(
    @Query() dto: GetAppointmentsByLanguageAndClientDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getCreatedVsCompletedAppointmentsByLanguageAndClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-interpreting-type-and-client")
  async getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompanyAndClient(
    @Query() dto: GetAppointmentsByInterpretingTypeAndClientDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getCreatedVsCompletedAppointmentsByInterpretingTypeAndClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-cancelled-appointments-by-client")
  async getCancelledAppointmentsByCompanyAndClient(
    @Query() dto: GetCancelledAppointmentsByClientDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getCancelledAppointmentsByClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-duration-by-client")
  async getAppointmentsDurationByCompanyAndClient(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndClientDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getAppointmentsDurationByClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-completed-appointments-by-type-and-interpreter")
  async getCompletedAppointmentsByTypeAndInterpreter(
    @Query() dto: GetCompletedAppointmentByTypeAndInterpreterDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getCompletedAppointmentsByTypeAndInterpreter(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-canceled-appointments-by-type-and-interpreter")
  async getCanceledAppointmentsByTypeAndInterpreter(
    @Query() dto: GetCompletedAppointmentByTypeAndInterpreterDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getCanceledAppointmentsByTypeAndInterpreter(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-homepage-base-appointment-statistic-by-user")
  async getHomepageBaseAppointmentInfoByUserRoleId(
    @Query() dto: GetHomepageBaseAppointmentStatisticDto,
  ): Promise<IGetHomepageBaseAppointmentStatistic> {
    return await this.individualStatisticsService.getHomepageBaseAppointmentInfoByUserRoleId(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-homepage-charts-appointment-statistic-by-user")
  async getHomepageChartsAppointmentInfoByUserRoleId(
    @Query() dto: GetHomepageBaseAppointmentStatisticDto,
  ): Promise<IChartHomepageLineData> {
    return await this.individualStatisticsService.getHomepageChartsAppointmentInfoByUserRoleId(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-without-interpreter-by-client")
  async getAppointmentsWithoutInterpreterByTypeAndClient(
    @Query() dto: GetAppointmentsWithoutInterpreterByClientDto,
  ): Promise<IChartLineData> {
    return await this.individualStatisticsService.getAppointmentsWithoutInterpreterByTypeAndClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-spent-cost-by-interpreting-type-and-client")
  async getSpentCostByClient(@Query() dto: GetSpentCostByClient): Promise<IChartRoundData> {
    return await this.individualStatisticsService.getSpentCostByClient(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-earned-money-by-interpreter")
  async getEarnedMoneyByInterpreter(@Query() dto: GetEarnedMoneyByInterpreterDto): Promise<IChartRoundData> {
    return await this.individualStatisticsService.getEarnedMoneyByInterpreter(dto);
  }
}
