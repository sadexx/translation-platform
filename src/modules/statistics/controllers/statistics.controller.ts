import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { StatisticsService } from "src/modules/statistics/services";
import { IChartLineData, IGetFirstStatisticRecord } from "src/modules/statistics/common/interfaces";
import {
  GetAdminInterpreterStatisticsDto,
  GetAdminStatisticsDto,
  GetAppointmentsByInterpretingTypeDto,
  GetAppointmentsByLanguageDto,
  GetAppointmentsWithoutInterpreterDto,
  GetCancelledAppointmentDto,
  GetAppointmentsByTypeDto,
  GetRejectedVsAcceptedAppointmentsDto,
} from "src/modules/statistics/common/dto";

@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-first-admin-record-date")
  async getFirstAdminRecordDate(): Promise<IGetFirstStatisticRecord> {
    return await this.statisticsService.getFirstAdminRecordDate();
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-registered-and-active-users")
  async getRegisteredAndActiveUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    return await this.statisticsService.getRegisteredAndActiveUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-inactive-users")
  async getInactiveUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    return await this.statisticsService.getInactiveUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-unsuccessful-registration-attempts-users")
  async getUnsuccessfulRegistrationAttemptsUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    return await this.statisticsService.getUnsuccessfulRegistrationAttemptsUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-new-registration-users")
  async getNewRegistrationUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    return await this.statisticsService.getNewRegistrationUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-active-interpreters")
  async getActiveInterpreters(@Query() dto: GetAdminInterpreterStatisticsDto): Promise<IChartLineData> {
    return await this.statisticsService.getActiveInterpreters(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-deleted")
  async getDeleted(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    return await this.statisticsService.getDeleted(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rejected-vs-accepted-appointments")
  async getRejectedVsAcceptedAppointments(@Query() dto: GetAppointmentsByLanguageDto): Promise<IChartLineData> {
    return await this.statisticsService.getRejectedVsAcceptedAppointments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rejected-vs-accepted-appointments-by-interpreter")
  async getRejectedVsAcceptedAppointmentsByInterpreter(
    @Query() dto: GetRejectedVsAcceptedAppointmentsDto,
  ): Promise<IChartLineData> {
    return await this.statisticsService.getRejectedVsAcceptedAppointmentsByInterpreter(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-type")
  async getCreatedVsCompletedAppointmentsByType(@Query() dto: GetAppointmentsByTypeDto): Promise<IChartLineData> {
    return await this.statisticsService.getCreatedVsCompletedAppointmentsByType(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-language")
  async getCreatedVsCompletedAppointmentsByLanguage(
    @Query() dto: GetAppointmentsByLanguageDto,
  ): Promise<IChartLineData> {
    return await this.statisticsService.getCreatedVsCompletedAppointmentsByLanguage(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-interpreting-type")
  async getCreatedVsCompletedAppointmentsByInterpretingType(
    @Query() dto: GetAppointmentsByInterpretingTypeDto,
  ): Promise<IChartLineData> {
    return await this.statisticsService.getCreatedVsCompletedAppointmentsByInterpretingType(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-cancelled-appointments")
  async getCancelledAppointments(@Query() dto: GetCancelledAppointmentDto): Promise<IChartLineData> {
    return await this.statisticsService.getCancelledAppointments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-duration")
  async getAppointmentsDuration(@Query() dto: GetAppointmentsByTypeDto): Promise<IChartLineData> {
    return await this.statisticsService.getAppointmentsDuration(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-without-interpreter")
  async getAppointmentsWithoutInterpreterByType(
    @Query() dto: GetAppointmentsWithoutInterpreterDto,
  ): Promise<IChartLineData> {
    return await this.statisticsService.getAppointmentsWithoutInterpreterByType(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-unanswered-on-demand-requests")
  async getUnansweredOnDemandRequests(@Query() dto: GetAppointmentsByLanguageDto): Promise<IChartLineData> {
    return await this.statisticsService.getUnansweredOnDemandRequests(dto);
  }
}
