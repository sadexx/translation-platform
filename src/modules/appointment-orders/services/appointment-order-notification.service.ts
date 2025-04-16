import { Injectable } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";
import { IAppointmentDetails } from "src/modules/appointments/common/interfaces";
import { NotificationService } from "src/modules/notifications/services";
import { IAppointmentOrderInvitation } from "src/modules/search-engine-logic/common/interface";
import { UserRole } from "src/modules/users-roles/entities";

@Injectable()
export class AppointmentOrderNotificationService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderNotificationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  public async sendAcceptedOrderNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendAcceptedAppointmentNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send accepted appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendAcceptedGroupNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendAcceptedGroupAppointmentNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send accepted group appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendRepeatSingleNotification(
    interpreterId: string,
    platformId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitation,
  ): Promise<void> {
    this.notificationService
      .sendNewInvitationForAppointmentNotification(interpreterId, platformId, appointmentOrderInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send single new invitation for appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendRepeatGroupNotification(
    interpreterId: string,
    groupId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitation,
  ): Promise<void> {
    this.notificationService
      .sendNewInvitationForAppointmentsNotification(interpreterId, groupId, appointmentOrderInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send new group invitation for appointments notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendCanceledNotification(
    userRoleId: string,
    platformId: string,
    isGroup: boolean,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    const sendNotificationPromise = isGroup
      ? this.notificationService.sendAdminCanceledAppointmentsNotification(userRoleId, platformId, appointmentDetails)
      : this.notificationService.sendAdminCanceledAppointmentNotification(userRoleId, platformId, appointmentDetails);

    sendNotificationPromise.catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to send canceled appointment notification for userRoleId: ${userRoleId}`,
        error.stack,
      );
    });
  }

  public async sendNotificationToMatchedInterpretersForOrder(
    platformId: string,
    matchedInterpreterIds: string[],
    appointmentOrderInvitation: IAppointmentOrderInvitation,
  ): Promise<void> {
    for (const interpreterId of matchedInterpreterIds) {
      this.notificationService
        .sendRepeatInvitationForAppointmentNotification(interpreterId, platformId, appointmentOrderInvitation)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendNotificationToMatchedInterpretersForOrder with order platformId: ${platformId}`,
            error.stack,
          );
        });
    }
  }

  public async sendNotificationToMatchedInterpretersForGroup(
    platformId: string,
    matchedInterpreterIds: string[],
    appointmentOrderInvitation: IAppointmentOrderInvitation,
  ): Promise<void> {
    for (const interpreterId of matchedInterpreterIds) {
      this.notificationService
        .sendRepeatInvitationForAppointmentsNotification(interpreterId, platformId, appointmentOrderInvitation)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendRepeatInvitationForAppointmentsNotification with group platformId: ${platformId}`,
            error.stack,
          );
        });
    }
  }

  public async sendNotificationToAdmins(
    lfhAdmins: UserRole[],
    platformId: string,
    isOrderGroup: boolean,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    if (!isOrderGroup) {
      for (const admin of lfhAdmins) {
        this.notificationService
          .sendRedFlagForAppointmentNotification(admin.id, platformId, appointmentDetails)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Error in sendRedFlagForAppointmentNotification for order with platformId: ${platformId} `,
              error.stack,
            );
          });
      }
    } else {
      for (const admin of lfhAdmins) {
        this.notificationService
          .sendRedFlagForAppointmentsNotification(admin.id, platformId, appointmentDetails)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Error in sendRedFlagForAppointmentsNotification for order group with platformId: ${platformId} `,
              error.stack,
            );
          });
      }
    }
  }
}
