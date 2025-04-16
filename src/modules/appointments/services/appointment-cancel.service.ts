import { InjectRepository } from "@nestjs/typeorm";
import { Appointment, AppointmentCancellationInfo } from "src/modules/appointments/entities";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { CancelAppointmentDto } from "src/modules/appointments/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentParticipantType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { AppointmentOrderRecreationService } from "src/modules/appointment-orders-workflow/services";
import { ICreateAppointmentCancellationInfo } from "src/modules/appointments/common/interfaces";
import { AppointmentCommandService, AppointmentNotificationService } from "src/modules/appointments/services";
import { AttendeeManagementService } from "src/modules/chime-meeting-configuration/services";
import { MessagingManagementService } from "src/modules/chime-messaging-configuration/services";
import { HelperService } from "src/modules/helper/services";
import { findOneOrFail } from "src/common/utils";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { DiscountsService } from "src/modules/discounts/services";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { ADMIN_ROLES, CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders-shared/services";

@Injectable()
export class AppointmentCancelService {
  private readonly lokiLogger = new LokiLogger(AppointmentCancelService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentCancellationInfo)
    private readonly appointmentCancellationInfoRepository: Repository<AppointmentCancellationInfo>,
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentsCommandService: AppointmentCommandService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly helperService: HelperService,
    private readonly appointmentOrderRecreationService: AppointmentOrderRecreationService,
    private readonly discountsService: DiscountsService,
    private readonly generalPaymentsService: GeneralPaymentsService,
  ) {}

  public async cancelAppointment(
    id: string,
    user: ITokenUserData,
    dto?: CancelAppointmentDto,
    skipGroupCancellationCheck: boolean = false,
  ): Promise<MessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getCancelAppointmentOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (!appointment.appointmentAdminInfo) {
      throw new NotFoundException(`Appointment Admin Info not found in Appointment ${id}.`);
    }

    const isLiveFaceToFaceAppointment =
      appointment.status === EAppointmentStatus.LIVE &&
      appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE &&
      appointment.client?.id === user.userRoleId;

    if (
      appointment.status !== EAppointmentStatus.ACCEPTED &&
      appointment.status !== EAppointmentStatus.PENDING &&
      !isLiveFaceToFaceAppointment
    ) {
      throw new BadRequestException("The appointment cannot be cancelled in its current state.");
    }

    let isCancelledByClient = false;

    if (appointment.client && appointment.client.id === user.userRoleId) {
      if (dto && dto.isAdminCancelByClient !== undefined) {
        throw new BadRequestException("Incorrect field");
      }

      await this.cancelAppointmentByClient(appointment, skipGroupCancellationCheck);
      isCancelledByClient = true;
    }

    if (appointment.interpreter && appointment.interpreter.id === user.userRoleId) {
      if (dto && dto.isAdminCancelByClient !== undefined) {
        throw new BadRequestException("Incorrect field");
      }

      await this.cancelAppointmentByInterpreter(appointment, skipGroupCancellationCheck, user);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      await this.cancelAppointmentByAdmin(appointment);

      await this.appointmentNotificationService.sendAdminCanceledNotification(
        appointment.clientId!,
        appointment.platformId,
        { appointmentId: id },
      );

      if (appointment.interpreterId) {
        await this.appointmentNotificationService.sendAdminCanceledNotification(
          appointment.interpreterId,
          appointment.platformId,
          { appointmentId: id },
        );
      }

      if (dto && dto.isAdminCancelByClient) {
        isCancelledByClient = true;
      }
    }

    await this.createAppointmentCancellationInfo(appointment, user, dto);

    this.generalPaymentsService.cancelPayInAuth(appointment, isCancelledByClient).catch((error: Error) => {
      this.lokiLogger.error(`Cancel appointment. Cancel payin error: ${error.message} `, error.stack);
    });

    return { message: "Appointment cancelled successfully." };
  }

  public async cancelGroupAppointments(
    appointmentsGroupId: string,
    user: ITokenUserData,
    dto: CancelAppointmentDto,
  ): Promise<MessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getCancelGroupAppointmentsOptions(appointmentsGroupId);
    const appointments = await this.appointmentRepository.find(queryOptions);

    if (appointments.length === 0) {
      throw new NotFoundException("Appointment group not found.");
    }

    const appointmentsReadyForCancellation = appointments.filter(
      (appointment) =>
        appointment.status === EAppointmentStatus.ACCEPTED || appointment.status === EAppointmentStatus.PENDING,
    );

    if (appointmentsReadyForCancellation.length === 0) {
      throw new BadRequestException("There are no appointments that can be cancelled in this group.");
    }

    const skipGroupCancellationCheck = true;

    if (CLIENT_ROLES.includes(user.role)) {
      const clientAppointments = appointmentsReadyForCancellation.filter(
        (appointment) => appointment.client?.id === user.userRoleId,
      );

      await this.cancelAppointmentsByClient(clientAppointments, user, dto, skipGroupCancellationCheck);
    }

    if (INTERPRETER_ROLES.includes(user.role)) {
      const interpreterAppointments = appointmentsReadyForCancellation.filter(
        (appointment) => appointment.interpreter?.id === user.userRoleId,
      );

      await this.cancelAppointmentsByInterpreter(interpreterAppointments, user, dto, skipGroupCancellationCheck);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      await this.cancelAppointmentsByAdmin(appointmentsReadyForCancellation, user, dto);
    }

    return { message: "Appointment group cancelled successfully." };
  }

  private async cancelAppointmentByClient(
    appointment: Appointment,
    skipGroupCancellationCheck: boolean,
  ): Promise<void> {
    if (appointment.isGroupAppointment && !skipGroupCancellationCheck) {
      throw new BadRequestException(
        "Cannot cancel a single appointment. The entire appointment group must be cancelled.",
      );
    }

    if (appointment.status === EAppointmentStatus.PENDING) {
      await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.CANCELLED_ORDER);

      if (appointment.appointmentOrder) {
        if (!appointment.appointmentOrder.appointmentOrderGroup) {
          await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointment.appointmentOrder);
        }

        if (appointment.appointmentOrder.appointmentOrderGroup) {
          await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
            appointment.appointmentOrder.appointmentOrderGroup,
          );
        }
      }
    }

    if (
      appointment.status === EAppointmentStatus.ACCEPTED ||
      (appointment.status === EAppointmentStatus.LIVE &&
        appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE)
    ) {
      await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.CANCELLED);

      if (appointment.interpreterId) {
        await this.appointmentNotificationService.sendSingleNotification(
          appointment.interpreterId,
          appointment.platformId,
          { appointmentId: appointment.id },
        );
      }
    }

    if (
      !appointment.alternativePlatform &&
      appointment.participantType === EAppointmentParticipantType.MULTI_WAY &&
      appointment.chimeMeetingConfiguration
    ) {
      await this.helperService.deleteChimeMeetingWithAttendees(appointment.chimeMeetingConfiguration);
    }

    if (appointment.appointmentAdminInfo?.isRedFlagEnabled) {
      await this.helperService.disableRedFlag(appointment);
    }

    await this.discountsService.processDiscountAssociationIfExists(appointment.id);
    await this.messagingManagementService.handleChannelResolveProcess(appointment.id);
    await this.helperService.deleteAppointmentReminder(appointment.appointmentReminder);
    // TODO: call payin auth cancel
  }

  private async cancelAppointmentByInterpreter(
    appointment: Appointment,
    skipGroupCancellationCheck: boolean,
    user: ITokenUserData,
  ): Promise<void> {
    if (appointment.isGroupAppointment && appointment.sameInterpreter && !skipGroupCancellationCheck) {
      throw new BadRequestException(
        "Cannot cancel a single appointment. The entire appointment group must be cancelled.",
      );
    }

    if (appointment.chimeMeetingConfiguration && appointment.interpreterId) {
      await this.attendeeManagementService.deleteAttendeeByExternalUserId(
        appointment.chimeMeetingConfiguration,
        appointment.interpreterId,
      );
    }

    if (appointment.appointmentAdminInfo) {
      await this.appointmentsCommandService.updateAppointmentAdminInfo(appointment.appointmentAdminInfo);
    }

    await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.PENDING);
    await this.messagingManagementService.handleChannelResolveProcess(appointment.id, user.userRoleId);

    if (!skipGroupCancellationCheck) {
      await this.appointmentOrderRecreationService.handleOrderRecreationForCancelledAppointment(appointment);
    }
  }

  private async cancelAppointmentByAdmin(appointment: Appointment): Promise<void> {
    await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.CANCELLED);

    if (appointment.appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointment.appointmentOrder);
    }

    if (
      !appointment.alternativePlatform &&
      appointment.participantType === EAppointmentParticipantType.MULTI_WAY &&
      appointment.chimeMeetingConfiguration
    ) {
      await this.helperService.deleteChimeMeetingWithAttendees(appointment.chimeMeetingConfiguration);
    }

    await this.discountsService.processDiscountAssociationIfExists(appointment.id);
    await this.messagingManagementService.handleChannelResolveProcess(appointment.id);
    await this.helperService.deleteAppointmentReminder(appointment.appointmentReminder);
  }

  private async cancelAppointmentsByClient(
    appointments: Appointment[],
    user: ITokenUserData,
    dto: CancelAppointmentDto,
    skipGroupCancellationCheck: boolean,
  ): Promise<void> {
    await this.notifyInterpreters(appointments);

    for (const appointment of appointments) {
      await this.cancelAppointmentByClient(appointment, skipGroupCancellationCheck);

      if (appointment.appointmentAdminInfo) {
        await this.createAppointmentCancellationInfo(appointment, user, dto);
      }

      this.generalPaymentsService.cancelPayInAuth(appointment, true).catch((error: Error) => {
        this.lokiLogger.error(`Cancel appointment. Cancel payin error: ${error.message}`, error.stack);
      });
    }
  }

  private async cancelAppointmentsByInterpreter(
    appointments: Appointment[],
    user: ITokenUserData,
    dto: CancelAppointmentDto,
    skipGroupCancellationCheck: boolean,
  ): Promise<void> {
    const sameInterpreter = appointments.some((appointment) => appointment.sameInterpreter);

    const appointmentsAssignedToInterpreter = sameInterpreter
      ? appointments
      : appointments.filter((appointment) => appointment.interpreter?.id === user.userRoleId);

    if (appointmentsAssignedToInterpreter.length === 0) {
      throw new BadRequestException("You are not assigned to any appointments in this group.");
    }

    for (const appointment of appointmentsAssignedToInterpreter) {
      await this.cancelAppointmentByInterpreter(appointment, skipGroupCancellationCheck, user);

      if (appointment.appointmentAdminInfo) {
        await this.createAppointmentCancellationInfo(appointment, user, dto);
      }

      this.generalPaymentsService.cancelPayInAuth(appointment, false).catch((error: Error) => {
        this.lokiLogger.error(`Cancel appointment. Cancel payin error: ${error.message}`, error.stack);
      });
    }

    await this.appointmentOrderRecreationService.handleOrderRecreationForCancelledAppointment(
      appointmentsAssignedToInterpreter,
    );
  }

  private async cancelAppointmentsByAdmin(
    appointments: Appointment[],
    user: ITokenUserData,
    dto: CancelAppointmentDto,
  ): Promise<void> {
    const mainAppointment = appointments[0];
    const appointmentWithGroup = appointments.find(
      (appointment) => appointment.appointmentOrder && appointment.appointmentOrder.appointmentOrderGroupId,
    );

    if (appointmentWithGroup && appointmentWithGroup.appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        appointmentWithGroup.appointmentOrder.appointmentOrderGroup,
      );
    }

    if (!mainAppointment.appointmentsGroupId) {
      throw new BadRequestException("You can not cancel appointment without group id.");
    }

    if (mainAppointment.clientId) {
      await this.appointmentNotificationService.sendAdminCanceledGroupNotification(
        mainAppointment.clientId,
        mainAppointment.appointmentsGroupId,
        { appointmentsGroupId: mainAppointment.appointmentsGroupId },
      );
    }

    await this.notifyInterpreters(appointments);

    for (const appointment of appointments) {
      await this.cancelAppointmentByAdmin(appointment);

      if (appointment.appointmentAdminInfo) {
        await this.createAppointmentCancellationInfo(appointment, user, dto);
      }

      this.generalPaymentsService.cancelPayInAuth(appointment, dto?.isAdminCancelByClient).catch((error: Error) => {
        this.lokiLogger.error(`Cancel appointment. Cancel payin error: ${error.message}`, error.stack);
      });
    }
  }

  private async notifyInterpreters(appointments: Appointment[]): Promise<void> {
    let notifiedInterpreterId: string | null = null;

    for (const appointment of appointments) {
      const { sameInterpreter, appointmentsGroupId, interpreterId, platformId, id } = appointment;

      if (sameInterpreter && appointmentsGroupId) {
        if (!notifiedInterpreterId && interpreterId) {
          notifiedInterpreterId = interpreterId;
          await this.appointmentNotificationService.sendGroupNotification(interpreterId, appointmentsGroupId, {
            appointmentsGroupId,
          });
        }
      } else if (interpreterId) {
        await this.appointmentNotificationService.sendSingleNotification(interpreterId, platformId, {
          appointmentId: id,
        });
      }
    }
  }

  private async createAppointmentCancellationInfo(
    appointment: Appointment,
    user: ITokenUserData,
    dto?: CancelAppointmentDto,
  ): Promise<void> {
    if (!user.userRoleId || !appointment.appointmentAdminInfo) {
      this.lokiLogger.error(`Appointment cancel. Not enough info. Appointment: ${appointment.id}`);

      throw new BadRequestException("Appointment cancel. Not enough info.");
    }

    let cancelledByUserRoleId = user.userRoleId;

    if (dto && dto.isAdminCancelByClient === true && appointment.clientId) {
      cancelledByUserRoleId = appointment.clientId;
    }

    if (dto && dto.isAdminCancelByClient === false && appointment.interpreterId) {
      cancelledByUserRoleId = appointment.interpreterId;
    }

    const userRole = await this.helperService.getUserRoleById(cancelledByUserRoleId, {
      user: true,
      profile: true,
      role: true,
    });
    const cancellationInfoDto: ICreateAppointmentCancellationInfo = {
      appointmentAdminInfo: appointment.appointmentAdminInfo,
      cancelledById: cancelledByUserRoleId,
      cancelledByPlatformId: userRole.user.platformId,
      cancelledByFirstName: userRole.profile.firstName,
      roleName: userRole.role.name,
      cancellationReason: dto?.cancellationReason ?? null,
    };
    const newCancellationInfo = this.appointmentCancellationInfoRepository.create(cancellationInfoDto);
    await this.appointmentCancellationInfoRepository.save(newCancellationInfo);
  }
}
