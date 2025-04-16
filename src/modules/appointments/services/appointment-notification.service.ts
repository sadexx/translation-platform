import { Injectable } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { IAppointmentDetails } from "../common/interfaces";
import { EPaymentFailedReason } from "src/modules/payments/common/enums";

@Injectable()
export class AppointmentNotificationService {
  private readonly lokiLogger = new LokiLogger(AppointmentNotificationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  public async sendToClientLateNotification(
    clientId: string,
    lateMinutes: number,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientLateNotification(clientId, lateMinutes, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send client late notification for userRoleId: ${clientId}`, error.stack);
      });

    return;
  }

  public async sendToInterpreterLateNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendInterpreterLateNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send interpreter late notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });

    return;
  }

  public async sendAppointmentPaymentFailedNotification(
    clientId: string,
    platformId: string,
    reason: EPaymentFailedReason,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendAppointmentPaymentFailedNotification(clientId, platformId, reason, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send appointment payment failed notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendUpdatedNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientChangedAppointmentNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send client changed appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendCancelledNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientCanceledAppointmentNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send client canceled appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendLiveAppointmentEndingSoonNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendLiveAppointmentEndingSoonNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send live appointment ending soon notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendGroupNotification(
    interpreterId: string,
    groupId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientCanceledAppointmentsNotification(interpreterId, groupId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send group client canceled appointments notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendSingleNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientCanceledAppointmentNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send single client canceled appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendAdminCanceledNotification(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendAdminCanceledAppointmentNotification(userRoleId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send admin canceled appointment notification for userRoleId: ${userRoleId}`,
          error.stack,
        );
      });
  }

  public async sendAdminCanceledGroupNotification(
    clientId: string,
    groupId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendAdminCanceledAppointmentsNotification(clientId, groupId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send admin canceled group appointments notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendClientUpdatedTimeNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientUpdatedTimeNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send client updated time notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });

    return;
  }

  public async sendInterpreterUpdatedTimeNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendInterpreterUpdatedTimeNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send interpreter updated time notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });

    return;
  }

  public async sendClientRatingNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientRatingNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send client rating notification for userRoleId: ${clientId}`, error.stack);
      });

    return;
  }

  public async sendInterpreterRatingNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendInterpreterRatingNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send interpreter rating notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });

    return;
  }

  public async notifyUserAboutAppointmentCompletion(
    userRoleId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendAppointmentCompletedNotification(userRoleId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send appointment completed notification for userRoleId: ${userRoleId}`,
          error.stack,
        );
      });
  }
}
