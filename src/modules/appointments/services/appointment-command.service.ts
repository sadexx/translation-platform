import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/entities";
import { IJoinMeeting } from "src/modules/chime-meeting-configuration/common/interfaces";
import { AttendeeManagementService, MeetingJoinService } from "src/modules/chime-meeting-configuration/services";
import { UserRole } from "src/modules/users-roles/entities";
import { Repository } from "typeorm";
import { MessagingCreationService } from "src/modules/chime-messaging-configuration/services";
import { AppointmentEndService, AppointmentNotificationService } from "src/modules/appointments/services";
import { ConfigService } from "@nestjs/config";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { findOneOrFail } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import {
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_TEN_MINUTES,
} from "src/common/constants";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders-shared/services";

@Injectable()
export class AppointmentCommandService {
  private readonly BACK_END_URL: string;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly appointmentEndService: AppointmentEndService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly meetingJoinService: MeetingJoinService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly messagingCreationService: MessagingCreationService,
    private readonly configService: ConfigService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("backEndUrl");
  }

  public async deleteAppointment(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getDeleteAppointmentOptions(id, user.id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (appointment.status !== EAppointmentStatus.CANCELLED_ORDER) {
      throw new BadRequestException("The appointment in this state cannot be deleted");
    }

    const appointmentOrderGroupId = appointment.appointmentOrder?.appointmentOrderGroup?.id;

    delete appointment.appointmentOrder?.appointmentOrderGroup;

    await this.appointmentRepository.remove(appointment);

    if (appointmentOrderGroupId) {
      await this.appointmentOrderSharedLogicService.deleteAppointmentOrderGroupIfEmpty(appointmentOrderGroupId);
    }

    return;
  }

  public async archiveAppointment(id: string, user: ITokenUserData): Promise<MessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getArchiveAppointmentOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (
      appointment.status !== EAppointmentStatus.CANCELLED_ORDER &&
      appointment.status !== EAppointmentStatus.CANCELLED &&
      appointment.status !== EAppointmentStatus.CANCELLED_BY_SYSTEM &&
      appointment.status !== EAppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException("The appointment cannot be archived in its current state.");
    }

    if (appointment.client?.userId === user.id) {
      await this.appointmentRepository.update(id, { archivedByClient: true });
    } else {
      await this.appointmentRepository.update(id, { archivedByInterpreter: true });
    }

    return { message: "Appointment archived successfully." };
  }

  public async sendLateNotification(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getSendLateNotificationOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);
    const lateMinutes =
      appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE
        ? NUMBER_OF_MINUTES_IN_TEN_MINUTES
        : NUMBER_OF_MINUTES_IN_FIVE_MINUTES;

    if (appointment.status !== EAppointmentStatus.LIVE) {
      throw new BadRequestException("Appointment must be live to send a late notification.");
    }

    if (appointment.clientId && appointment.interpreterId && appointment.clientId === user.userRoleId) {
      const LATE_NOTIFICATION_LINK = `${this.BACK_END_URL}/v1/appointments/commands/late-notification/${appointment.id}`;

      await this.appointmentNotificationService.sendToInterpreterLateNotification(
        appointment.interpreterId,
        appointment.platformId,
        {
          appointmentId: appointment.id,
          lateNotificationLink: LATE_NOTIFICATION_LINK,
          lateMinutes: String(lateMinutes),
        },
      );
    }

    if (appointment.interpreterId && appointment.clientId && appointment.interpreterId === user.userRoleId) {
      await this.appointmentNotificationService.sendToClientLateNotification(appointment.clientId, lateMinutes, {
        appointmentId: appointment.id,
      });
    }

    return;
  }

  public async confirmExternalInterpreterFound(id: string): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getConfirmExternalInterpreterFoundOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (!appointment.appointmentAdminInfo) {
      throw new NotFoundException(`Appointment Admin Info not found in Appointment ${id}.`);
    }

    await this.appointmentAdminInfoRepository.update(appointment.appointmentAdminInfo.id, {
      isInterpreterFound: true,
    });
  }

  public async acceptAppointment(
    appointmentOrder: AppointmentOrder,
    interpreter: UserRole,
  ): Promise<MessageOutput | IJoinMeeting> {
    await this.messagingCreationService.createAppointmentChannel(appointmentOrder.appointment, interpreter);

    if (appointmentOrder.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      return await this.acceptOnDemandAppointment(appointmentOrder, interpreter);
    } else {
      return await this.acceptPreBookedAppointment(appointmentOrder, interpreter);
    }
  }

  private async acceptOnDemandAppointment(
    appointmentOrder: AppointmentOrder,
    interpreter: UserRole,
  ): Promise<MessageOutput | IJoinMeeting> {
    if (appointmentOrder.appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      await this.acceptOnDemandFaceToFaceAppointment(appointmentOrder, interpreter);
    } else {
      return await this.acceptOnDemandVirtualAppointment(appointmentOrder, interpreter);
    }

    return { message: "Appointment order accepted successfully." };
  }

  private async acceptOnDemandFaceToFaceAppointment(
    appointmentOrder: AppointmentOrder,
    interpreter: UserRole,
  ): Promise<void> {
    await this.appointmentRepository.update(appointmentOrder.appointment.id, {
      interpreter: interpreter,
      status: EAppointmentStatus.ACCEPTED,
      acceptedDate: new Date(),
    });

    if (appointmentOrder.appointment.appointmentAdminInfo) {
      await this.updateAppointmentAdminInfo(appointmentOrder.appointment.appointmentAdminInfo, interpreter);
    }
  }

  private async acceptOnDemandVirtualAppointment(
    appointmentOrder: AppointmentOrder,
    interpreter: UserRole,
  ): Promise<IJoinMeeting> {
    await this.appointmentRepository.update(appointmentOrder.appointment.id, {
      interpreter: interpreter,
      acceptedDate: new Date(),
    });

    if (appointmentOrder.appointment.appointmentAdminInfo) {
      await this.updateAppointmentAdminInfo(appointmentOrder.appointment.appointmentAdminInfo, interpreter);
    }

    return await this.meetingJoinService.joinOnDemandMeeting(appointmentOrder, interpreter);
  }

  private async acceptPreBookedAppointment(
    appointmentOrder: AppointmentOrder,
    interpreter: UserRole,
  ): Promise<MessageOutput> {
    await this.appointmentRepository.update(appointmentOrder.appointment.id, {
      interpreter: interpreter,
      status: EAppointmentStatus.ACCEPTED,
      acceptedDate: new Date(),
    });

    if (appointmentOrder.appointment.appointmentAdminInfo) {
      await this.updateAppointmentAdminInfo(appointmentOrder.appointment.appointmentAdminInfo, interpreter);
    }

    if (
      !appointmentOrder.appointment.alternativePlatform &&
      appointmentOrder.appointment.communicationType !== EAppointmentCommunicationType.FACE_TO_FACE
    ) {
      return await this.attendeeManagementService.addInterpreterToPreBookedMeeting(appointmentOrder, interpreter);
    }

    return { message: "Appointment order accepted successfully." };
  }

  public async updateAppointmentAdminInfo(
    appointmentAdminInfo: AppointmentAdminInfo,
    interpreter?: UserRole,
  ): Promise<void> {
    if (appointmentAdminInfo) {
      await this.appointmentAdminInfoRepository.update(appointmentAdminInfo.id, {
        interpreterFirstName: interpreter ? interpreter.profile.firstName : null,
        interpreterLastName: interpreter ? interpreter.profile.lastName : null,
        interpreterPhone: interpreter ? interpreter.user.phoneNumber : null,
        interpreterEmail: interpreter ? interpreter.profile.contactEmail : null,
        interpreterDateOfBirth: interpreter ? interpreter.profile.dateOfBirth : null,
        isInterpreterFound: interpreter ? true : false,
        isRedFlagEnabled: interpreter ? false : appointmentAdminInfo.isRedFlagEnabled,
      });
    }
  }

  public async finalizeVirtualAppointmentAndSaveRecording(
    appointment: Appointment,
    recordingCallDirectory: string,
  ): Promise<void> {
    await this.appointmentEndService.finalizeChimeVirtualAppointment(appointment);

    if (appointment.appointmentAdminInfo) {
      await this.saveS3RecordingKey(appointment.appointmentAdminInfo.id, recordingCallDirectory);
    }
  }

  public async saveS3RecordingKey(id: string, recordingCallDirectory: string): Promise<void> {
    await this.appointmentAdminInfoRepository.update(id, {
      callRecordingS3Key: recordingCallDirectory,
    });
  }

  public getBusinessExtensionTimeInMinutes(appointment: Appointment): number {
    if (appointment.interpretingType === EAppointmentInterpretingType.SIGN_LANGUAGE) {
      return NUMBER_OF_MINUTES_IN_HOUR;
    } else if (appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      return NUMBER_OF_MINUTES_IN_TEN_MINUTES;
    } else {
      return NUMBER_OF_MINUTES_IN_FIVE_MINUTES;
    }
  }
}
