import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { forwardRef, Inject } from "@nestjs/common";
import { Appointment } from "src/modules/appointments/entities";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import {
  NUMBER_OF_MILLISECONDS_IN_HOUR,
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
} from "src/common/constants";
import { MeetingClosingService } from "src/modules/chime-meeting-configuration/services";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentEndService, AppointmentNotificationService } from "src/modules/appointments/services";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { findOneOrFail } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { ConfigService } from "@nestjs/config";

export class AppointmentSchedulerService {
  private readonly lokiLogger = new LokiLogger(AppointmentSchedulerService.name);
  private readonly INACTIVITY_THRESHOLD_MINUTES: number = 4;
  private readonly ACTIVATION_WINDOW_MINUTES: number = 5;
  private readonly ACTIVATION_WINDOW_MS: number = this.ACTIVATION_WINDOW_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;
  private readonly INACTIVITY_THRESHOLD_MS = this.INACTIVITY_THRESHOLD_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;
  private readonly BACK_END_URL: string;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @Inject(forwardRef(() => MeetingClosingService))
    private readonly meetingClosingService: MeetingClosingService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentEndService: AppointmentEndService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly configService: ConfigService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("backEndUrl");
  }

  public async activateUpcomingAppointments(): Promise<void> {
    const currentTime = new Date();
    currentTime.setSeconds(0, 0);
    const activationThresholdEnd = new Date(currentTime.getTime() + this.ACTIVATION_WINDOW_MS);
    activationThresholdEnd.setSeconds(0, 0);

    const queryOptions = this.appointmentQueryOptionsService.getActivateUpcomingAppointmentsOptions(
      currentTime,
      activationThresholdEnd,
    );
    const updateResult = await this.appointmentRepository.update(queryOptions, {
      status: EAppointmentStatus.LIVE,
    });

    if (updateResult.affected && updateResult.affected > 0) {
      this.lokiLogger.log(`Activated ${updateResult.affected} upcoming appointments.`);
    }
  }

  public async closeInactiveOrPaymentFailedLiveAppointments(): Promise<void> {
    const currentTime = new Date();
    currentTime.setSeconds(0, 0);
    const thresholdTime = new Date(currentTime.getTime() - this.INACTIVITY_THRESHOLD_MS);
    thresholdTime.setSeconds(0, 0);

    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptionsService.getCloseInactiveOrPaymentFailedLiveAppointmentsOptions(
      queryBuilder,
      thresholdTime,
    );
    const liveAppointments = await queryBuilder.getMany();

    if (liveAppointments.length > 0) {
      this.lokiLogger.log(`Found ${liveAppointments.length} live appointments for closing.`);
      await this.closeInactiveOrPaymentFailedMeetings(liveAppointments);
    }
  }

  private async closeInactiveOrPaymentFailedMeetings(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      const { clientLastActiveTime, chimeMeetingConfiguration } = appointment;

      if (!chimeMeetingConfiguration || !chimeMeetingConfiguration.chimeMeetingId || !clientLastActiveTime) {
        this.lokiLogger.error(
          `No Chime Meeting Configuration found for appointment Id: ${appointment.id}, skipping closing. Trying to close expired appointments without client visit.`,
        );
        await this.closeExpiredAppointmentsWithoutClientVisit();
        continue;
      }

      this.lokiLogger.log(`Closing appointment with Id: ${appointment.id}`);
      await this.meetingClosingService.closeMeeting(chimeMeetingConfiguration.chimeMeetingId);
    }
  }

  public async closeExpiredAppointmentsWithoutClientVisit(): Promise<void> {
    const currentTime = new Date();

    const queryOptions =
      this.appointmentQueryOptionsService.getCloseExpiredAppointmentsWithoutClientVisitOptions(currentTime);
    const appointmentsToClose = await this.appointmentRepository.find(queryOptions);

    if (appointmentsToClose.length > 0) {
      this.lokiLogger.log(`Found ${appointmentsToClose.length} expired scheduled appointments.`);
      await this.closeExpiredScheduledMeetings(appointmentsToClose);
    }
  }

  private async closeExpiredScheduledMeetings(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      await this.appointmentEndService.finalizeChimeVirtualAppointment(appointment);

      const { chimeMeetingConfiguration } = appointment;

      if (!chimeMeetingConfiguration) {
        this.lokiLogger.error(`No Chime Meeting Configuration found for appointment Id: ${appointment.id}`);
        continue;
      }

      const queryOptions = this.appointmentQueryOptionsService.getCloseExpiredScheduledMeetingsOptions(
        chimeMeetingConfiguration.id,
      );
      const meetingConfig = await findOneOrFail(
        chimeMeetingConfiguration.id,
        this.chimeMeetingConfigurationRepository,
        queryOptions,
      );

      this.lokiLogger.log(`Closing expired scheduled appointment with Id: ${appointment.id}`);
      await this.meetingClosingService.deleteMeetingConfigAndReminder(meetingConfig);
    }
  }

  public async processCompletedAppointments(): Promise<void> {
    const currentTime = new Date();
    currentTime.setSeconds(0, 0);

    const queryOptions = this.appointmentQueryOptionsService.getProcessCompletedAppointmentsOptions(currentTime);
    const completedAppointments = await this.appointmentRepository.find(queryOptions);

    if (completedAppointments.length > 0) {
      await this.handleCompletedAppointments(completedAppointments);
    }
  }

  private async handleCompletedAppointments(appointments: Appointment[]): Promise<void> {
    const completedAppointmentsIds = appointments.map((appointment) => appointment.id);
    await this.updateCompletedAppointmentsStatus(completedAppointmentsIds);

    for (const appointment of appointments) {
      if (appointment.clientId && appointment.interpreterId) {
        await this.appointmentNotificationService.notifyUserAboutAppointmentCompletion(
          appointment.clientId,
          appointment.platformId,
          { appointmentId: appointment.id },
        );
        await this.appointmentNotificationService.notifyUserAboutAppointmentCompletion(
          appointment.interpreterId,
          appointment.platformId,
          { appointmentId: appointment.id },
        );
      }
    }
  }

  private async updateCompletedAppointmentsStatus(completedAppointmentsIds: string[]): Promise<void> {
    const updateResult = await this.appointmentRepository
      .createQueryBuilder()
      .update(Appointment)
      .set({ status: EAppointmentStatus.COMPLETED_ACTION_REQUIRED })
      .whereInIds(completedAppointmentsIds)
      .execute();

    this.lokiLogger.log(`Updated status to completed-action-required for ${updateResult.affected} appointments.`);
  }

  public async finalizeCompletedAppointmentsAfterSignatureTimeout(): Promise<void> {
    const currentTime = new Date();
    const signedTimeoutThreshold = new Date(currentTime.getTime() - NUMBER_OF_MILLISECONDS_IN_HOUR);

    const queryOptions =
      this.appointmentQueryOptionsService.getFinalizeCompletedAppointmentsAfterSignatureTimeoutOptions(
        signedTimeoutThreshold,
      );
    const pendingFinalizationAppointments = await this.appointmentRepository.find(queryOptions);

    if (pendingFinalizationAppointments.length > 0) {
      this.lokiLogger.log(
        `Found ${pendingFinalizationAppointments.length} completed appointments to finalize after timeout.`,
      );
      await this.finalizeTimedOutCompletedAppointments(pendingFinalizationAppointments);
    }
  }

  private async finalizeTimedOutCompletedAppointments(appointments: Appointment[]): Promise<void> {
    for (const appointment of appointments) {
      const { appointmentEndDetail } = appointment;

      if (appointmentEndDetail) {
        await this.appointmentEndService.finalizeCompletedAppointment(appointment, appointmentEndDetail);
      }
    }
  }

  public async processInterpreterHasLateAppointments(): Promise<void> {
    const currentTime = new Date();
    const lateThreshold = new Date(currentTime.getTime() - NUMBER_OF_MILLISECONDS_IN_MINUTE);

    const queryOptions = this.appointmentQueryOptionsService.getInterpreterHasLateAppointmentsOptions(lateThreshold);
    const interpreterHasLateAppointments = await this.appointmentRepository.find(queryOptions);

    if (interpreterHasLateAppointments.length > 0) {
      this.lokiLogger.log(`Found ${interpreterHasLateAppointments.length} appointments with late interpreters.`);
      await this.handleInterpreterHasLateAppointments(interpreterHasLateAppointments);
    }
  }

  private async handleInterpreterHasLateAppointments(appointments: Appointment[]): Promise<void> {
    const interpreterHasLateAppointmentsIds = appointments.map((appointment) => appointment.id);
    await this.updateInterpreterHasLateAppointments(interpreterHasLateAppointmentsIds);
    const convertedLateMinutes = String(NUMBER_OF_MINUTES_IN_FIVE_MINUTES);

    for (const appointment of appointments) {
      if (appointment.interpreterId) {
        const LATE_NOTIFICATION_LINK = `${this.BACK_END_URL}/v1/appointments/commands/late-notification/${appointment.id}`;

        await this.appointmentNotificationService.sendToInterpreterLateNotification(
          appointment.interpreterId,
          appointment.platformId,
          {
            appointmentId: appointment.id,
            lateNotificationLink: LATE_NOTIFICATION_LINK,
            lateMinutes: convertedLateMinutes,
          },
        );
      }
    }
  }

  private async updateInterpreterHasLateAppointments(interpreterHasLateAppointmentsIds: string[]): Promise<void> {
    const updateResult = await this.chimeMeetingConfigurationRepository
      .createQueryBuilder()
      .update(ChimeMeetingConfiguration)
      .set({ isInterpreterWasOnlineInBooking: false })
      .where("appointmentId IN (:...ids)", { ids: interpreterHasLateAppointmentsIds })
      .execute();

    this.lokiLogger.log(`Mark isInterpreterWasOnlineInBooking to false for ${updateResult.affected} appointments.`);
  }
}
