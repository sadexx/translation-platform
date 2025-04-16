import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BackyCheckService } from "src/modules/backy-check/services";
import { FillStatisticsService } from "src/modules/statistics/services";
import { NotificationService } from "src/modules/notifications/services";
import { EventReminderService } from "src/modules/event-reminder/services";
import { AppointmentSchedulerService } from "src/modules/appointments/services";
import { MessagingManagementService } from "src/modules/chime-messaging-configuration/services";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { EStatisticType } from "src/modules/statistics/common/enums";
import { OrderSchedulerService } from "src/modules/appointment-orders/services";
import { CustomCronExpressionEnum } from "src/modules/ex-cron/common/enum";
import { DraftAppointmentService } from "src/modules/draft-appointments/services";
import { RemovalService } from "src/modules/removal/services";
import { MembershipAssignmentsService } from "src/modules/memberships/services";
import { LokiLogger } from "src/common/logger";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";

@Injectable()
export class CronService {
  private readonly lokiLogger = new LokiLogger(CronService.name);
  public constructor(
    private readonly backyCheckService: BackyCheckService,
    private readonly fillStatisticsService: FillStatisticsService,
    private readonly notificationService: NotificationService,
    private readonly eventReminderService: EventReminderService,
    private readonly appointmentSchedulerService: AppointmentSchedulerService,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly orderSchedulerService: OrderSchedulerService,
    private readonly draftAppointmentService: DraftAppointmentService,
    private readonly removalService: RemovalService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly generalPaymentsService: GeneralPaymentsService,
    private readonly companiesDepositChargeService: CompaniesDepositChargeService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCheckBackyCheckStatus(): Promise<void> {
    try {
      await this.backyCheckService.checkBackyCheckStatus();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCheckBackyCheckStatus: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoRemovingCompanies(): Promise<void> {
    try {
      await this.removalService.deleteCompanies();
    } catch (error) {
      this.lokiLogger.error(`Error in autoRemovingCompanies: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoRemovingUserRoles(): Promise<void> {
    try {
      await this.removalService.deleteUserRoles();
    } catch (error) {
      this.lokiLogger.error(`Error in autoRemovingUserRoles: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoDeleteUnfinishedRegistrationUserRoles(): Promise<void> {
    try {
      await this.removalService.deleteUnfinishedRegistrationUserRoles();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoDeleteUnfinishedRegistrationUserRoles: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoReminderNotifications(): Promise<void> {
    try {
      await this.eventReminderService.startAutoReminder();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoReminderNotifications: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async autoDeletionNotifications(): Promise<void> {
    try {
      await this.notificationService.deleteOldNotifications();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoDeletionNotifications: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async autoDeletionDraftAppointments(): Promise<void> {
    try {
      await this.draftAppointmentService.deleteOldDraftAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoDeletionDraftAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoActivateUpcomingAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.activateUpcomingAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoActivateUpcomingAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCloseInactiveOrPaymentFailedLiveAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.closeInactiveOrPaymentFailedLiveAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCloseInactiveOrPaymentFailedLiveAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoCloseExpiredAppointmentsWithoutClientVisit(): Promise<void> {
    try {
      await this.appointmentSchedulerService.closeExpiredAppointmentsWithoutClientVisit();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoCloseExpiredAppointmentsWithoutClientVisit: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoDeleteOldChannels(): Promise<void> {
    try {
      await this.messagingManagementService.deleteOldChannels();
    } catch (error) {
      this.lokiLogger.error(`Error in autoDeleteOldChannels: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CustomCronExpressionEnum.EVERY_TWO_MINUTE)
  async autoProcessCompletedAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.processCompletedAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessCompletedAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CustomCronExpressionEnum.EVERY_TWO_MINUTE)
  async autoFinalizeCompletedAppointmentsAfterSignatureTimeout(): Promise<void> {
    try {
      await this.appointmentSchedulerService.finalizeCompletedAppointmentsAfterSignatureTimeout();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoFinalizeCompletedAppointmentsAfterSignatureTimeout: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoProcessInterpreterHasLateAppointments(): Promise<void> {
    try {
      await this.appointmentSchedulerService.processInterpreterHasLateAppointments();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessInterpreterHasLateAppointments: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CustomCronExpressionEnum.EVERY_TWO_MINUTE)
  async autoProcessNextRepeatTimeOrders(): Promise<void> {
    try {
      await this.orderSchedulerService.processNextRepeatTimeOrders();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessNextRepeatTimeOrders: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoProcessNotifyAdminOrders(): Promise<void> {
    try {
      await this.orderSchedulerService.processNotifyAdminOrders();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessNotifyAdminOrders: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CustomCronExpressionEnum.EVERY_TWO_MINUTE)
  async autoProcessEndSearchTimeOrders(): Promise<void> {
    try {
      await this.orderSchedulerService.processEndSearchTimeOrders();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessEndSearchTimeOrders: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async autoProcessSearchEngineTasks(): Promise<void> {
    try {
      await this.orderSchedulerService.processSearchEngineTasks();
    } catch (error) {
      this.lokiLogger.error(
        `Error in autoProcessSearchEngineTasks: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async fillDailyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillDailyStatistics start");

    try {
      const previousDayDate = subDays(new Date(), 1);
      const startOfPreviousDay = startOfDay(previousDayDate);
      const endOfPreviousDay = endOfDay(previousDayDate);

      const statisticType = EStatisticType.DAILY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousDay, endOfPreviousDay, statisticType);
      this.lokiLogger.log("Cron fillDailyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillDailyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CustomCronExpressionEnum.EVERY_MONDAY_AT_MIDNIGHT)
  async fillWeeklyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillWeeklyStatistics start");

    const SIX_DAYS = 6;
    try {
      const startOfPreviousWeek = subDays(startOfWeek(new Date()), SIX_DAYS);
      const endOfPreviousWeek = subDays(endOfWeek(new Date()), SIX_DAYS);

      const statisticType = EStatisticType.WEEKLY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousWeek, endOfPreviousWeek, statisticType);
      this.lokiLogger.log("Cron fillWeeklyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillWeeklyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async fillMonthlyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillMonthlyStatistics start");
    try {
      const previousMonth = subMonths(new Date(), 1);

      const startOfPreviousMonth = startOfMonth(previousMonth);
      const endOfPreviousMonth = endOfMonth(previousMonth);

      const statisticType = EStatisticType.MONTHLY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousMonth, endOfPreviousMonth, statisticType);
      this.lokiLogger.log("Cron fillMonthlyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillMonthlyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CronExpression.EVERY_YEAR)
  async fillYearlyStatistics(): Promise<void> {
    this.lokiLogger.log("Cron fillYearlyStatistics start");
    try {
      const previousYear = subYears(new Date(), 1);

      const startOfPreviousYear = startOfYear(previousYear);
      const endOfPreviousYear = endOfYear(previousYear);

      const statisticType = EStatisticType.YEARLY;

      await this.fillStatisticsService.fillStatisticByPeriod(startOfPreviousYear, endOfPreviousYear, statisticType);
      this.lokiLogger.log("Cron fillYearlyStatistics end");
    } catch (error) {
      this.lokiLogger.error(`Error in fillYearlyStatistics: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async deactivateExpiredMemberships(): Promise<void> {
    try {
      await this.membershipAssignmentsService.deactivateExpiredMemberships();
    } catch (error) {
      this.lokiLogger.error(
        `Error in deactivateExpiredMemberships: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkPaymentWaitList(): Promise<void> {
    try {
      await this.generalPaymentsService.checkPaymentWaitList();
    } catch (error) {
      this.lokiLogger.error(`Error in checkPaymentWaitList: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  // TODO R: Change to 10 minutes?
  @Cron(CronExpression.EVERY_MINUTE)
  async checkDepositCharges(): Promise<void> {
    try {
      await this.companiesDepositChargeService.chargeCompaniesDeposit();
    } catch (error) {
      this.lokiLogger.error(`Error in checkDepositCharges: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }
}
