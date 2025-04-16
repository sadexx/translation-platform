import { Injectable } from "@nestjs/common";
import { NotificationService } from "src/modules/notifications/services";
import {
  IAppointmentOrderInvitation,
  IOnDemandInvitation,
  ISearchConditions,
} from "src/modules/search-engine-logic/common/interface";
import { UserRole } from "src/modules/users-roles/entities";
import { IAppointmentDetails } from "src/modules/appointments/common/interfaces";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class SearchEngineNotificationService {
  private readonly lokiLogger = new LokiLogger(SearchEngineNotificationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  public async sendSearchClientNotificationCaseTopic(
    clientId: string,
    platformId: string,
    searchConditions: ISearchConditions,
  ): Promise<void> {
    this.notificationService
      .sendNoExpertiseMatchNotification(clientId, platformId, searchConditions)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send search notification case: topic, for order for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendSearchClientNotificationCaseGenderAndTopic(
    clientId: string,
    platformId: string,
    searchConditions: ISearchConditions,
  ): Promise<void> {
    this.notificationService
      .sendExperienceGenderMismatchNotification(clientId, platformId, searchConditions)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send search notification case: gender and topic, for order for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendSearchClientNotificationCaseGender(
    clientId: string,
    platformId: string,
    searchConditions: ISearchConditions,
  ): Promise<void> {
    this.notificationService
      .sendGenderMismatchNotification(clientId, platformId, searchConditions)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send search notification case: gender, for order for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendNotificationToAdmins(
    lfhAdmins: UserRole[],
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
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
  }

  public async sendOnDemandNotification(
    interpreterId: string,
    platformId: string,
    onDemandInvitation: IOnDemandInvitation,
  ): Promise<void> {
    this.notificationService
      .sendNewOnDemandInvitationForAppointmentNotification(interpreterId, platformId, onDemandInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send on-demand new invitation for appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendGroupNotification(
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

  public async sendSingleNotification(
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
}
