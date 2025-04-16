import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { Appointment } from "src/modules/appointments/entities";
import { AppointmentCancelService, AppointmentCommandService } from "src/modules/appointments/services";
import { IJoinMeeting } from "src/modules/chime-meeting-configuration/common/interfaces";
import { UserRole } from "src/modules/users-roles/entities";
import { Repository } from "typeorm";
import { AppointmentOrderNotificationService } from "src/modules/appointment-orders/services";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders-shared/services";
import { findOneOrFail } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import {
  AcceptAppointmentDto,
  AddInterpreterToOrderDto,
  SendRepeatNotificationDto,
} from "src/modules/appointment-orders/common/dto";
import { BookingSlotManagementService } from "src/modules/booking-slot-management/services";
import { DEFAULT_INTERPRETER_CANCELLATION_REASON } from "src/common/constants";
import { HelperService } from "src/modules/helper/services";
import { EAppointmentSchedulingType } from "src/modules/appointments/common/enums";

@Injectable()
export class AppointmentOrderCommandService {
  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentCommandService: AppointmentCommandService,
    private readonly appointmentCancelService: AppointmentCancelService,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly helperService: HelperService,
    private readonly bookingSlotManagementService: BookingSlotManagementService,
    private readonly appointmentOrderNotificationService: AppointmentOrderNotificationService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
  ) {}

  public async acceptAppointmentOrder(
    id: string,
    user: ITokenUserData,
    dto?: AcceptAppointmentDto,
  ): Promise<MessageOutput> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    if (!appointmentOrder.appointment.clientId) {
      throw new NotFoundException(`Client not found in Appointment Order with Id: ${id}.`);
    }

    if (appointmentOrder.appointmentOrderGroup && appointmentOrder.appointmentOrderGroup.sameInterpreter) {
      throw new BadRequestException("Cannot accept a single order. The entire appointment group must be accepted.");
    }

    await this.checkConflictingAppointmentsBeforeAccept(user, [appointmentOrder.appointment], dto?.ignoreConflicts);

    await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    const acceptedAppointment = await this.appointmentCommandService.acceptAppointment(appointmentOrder, interpreter);
    await this.appointmentOrderNotificationService.sendAcceptedOrderNotification(
      appointmentOrder.appointment.clientId,
      appointmentOrder.appointment.platformId,
      {
        appointmentId: appointmentOrder.appointment.id,
      },
    );

    if (appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.deleteAppointmentOrderGroupIfEmpty(
        appointmentOrder.appointmentOrderGroup.id,
      );
    }

    return acceptedAppointment as MessageOutput;
  }

  public async acceptAppointmentOnDemandOrder(id: string, user: ITokenUserData): Promise<IJoinMeeting> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const appointmentOrderOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, appointmentOrderOptions);

    if (!appointmentOrder.appointment.clientId) {
      throw new NotFoundException(`Client not found in Appointment Order with Id: ${id}.`);
    }

    await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    const acceptedAppointment = await this.appointmentCommandService.acceptAppointment(appointmentOrder, interpreter);
    await this.appointmentOrderNotificationService.sendAcceptedOrderNotification(
      appointmentOrder.appointment.clientId,
      appointmentOrder.platformId,
      {
        appointmentId: appointmentOrder.appointment.id,
      },
    );
    await this.helperService.makeOfflineInterpreterBeforeOnDemand(interpreter.id);
    await this.appointmentOrderSharedLogicService.cancelOnDemandCalls(appointmentOrder, interpreter.id);

    return acceptedAppointment as IJoinMeeting;
  }

  public async acceptAppointmentOrderGroup(
    id: string,
    user: ITokenUserData,
    dto?: AcceptAppointmentDto,
  ): Promise<{
    message: string;
  }> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderGroupOptions(id);
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    if (appointmentOrderGroup.appointmentOrders.length === 0) {
      throw new NotFoundException(`No appointment orders found in Appointment Order Group with Id: ${id}.`);
    }

    if (!appointmentOrderGroup.appointmentOrders[0].appointment.clientId) {
      throw new NotFoundException(`Client not found in Appointment Order with Id: ${id}.`);
    }

    const appointments = appointmentOrderGroup.appointmentOrders.map((order) => order.appointment);
    await this.checkConflictingAppointmentsBeforeAccept(user, appointments, dto?.ignoreConflicts);

    await this.appointmentOrderNotificationService.sendAcceptedGroupNotification(
      appointmentOrderGroup.appointmentOrders[0].appointment.clientId,
      appointmentOrderGroup.platformId,
      { appointmentsGroupId: appointmentOrderGroup.platformId },
    );

    for (const appointmentOrder of appointmentOrderGroup.appointmentOrders) {
      await this.appointmentCommandService.acceptAppointment(appointmentOrder, interpreter);
    }

    if (appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(appointmentOrderGroup);
    }

    return {
      message: "Appointment order group accepted successfully.",
    };
  }

  public async rejectAppointmentOrder(
    id: string,
    user: ITokenUserData,
  ): Promise<{
    message: string;
  }> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRejectAppointmentOrderOptions(id, interpreter.id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const updatedMatchedInterpreterIds = appointmentOrder.matchedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );
    const updatedRejectedInterpreterIds = [...appointmentOrder.rejectedInterpreterIds, interpreter.id];

    await this.appointmentOrderRepository.update(appointmentOrder.id, {
      matchedInterpreterIds: updatedMatchedInterpreterIds,
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return {
      message: "Appointment order rejected successfully.",
    };
  }

  public async rejectAppointmentOrderGroup(
    id: string,
    user: ITokenUserData,
  ): Promise<{
    message: string;
  }> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRejectAppointmentOrderGroupOptions(
      id,
      interpreter.id,
    );
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    const updatedMatchedInterpreterIds = appointmentOrderGroup.matchedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );
    const updatedRejectedInterpreterIds = [...appointmentOrderGroup.rejectedInterpreterIds, interpreter.id];

    await this.appointmentOrderGroupRepository.update(appointmentOrderGroup.id, {
      matchedInterpreterIds: updatedMatchedInterpreterIds,
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return {
      message: "Appointment order group rejected successfully.",
    };
  }

  public async refuseAppointmentOrder(id: string, user: ITokenUserData): Promise<void> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRefuseAppointmentOrderOptions(id, interpreter.id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const updatedRejectedInterpreterIds = appointmentOrder.rejectedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );

    await this.appointmentOrderRepository.update(appointmentOrder.id, {
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return;
  }

  public async refuseAppointmentOrderGroup(id: string, user: ITokenUserData): Promise<void> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRefuseAppointmentOrderGroupOptions(
      id,
      interpreter.id,
    );
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    const updatedRejectedInterpreterIds = appointmentOrderGroup.rejectedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );

    await this.appointmentOrderGroupRepository.update(appointmentOrderGroup.id, {
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return;
  }

  public async sendRepeatNotificationToInterpreters(
    id: string,
    dto: SendRepeatNotificationDto,
  ): Promise<MessageOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getSharedOrderForRepeatAndAddInterpreterOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    if (appointmentOrder.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      throw new BadRequestException("The appointment on-demand scheduling type is not repeatable.");
    }

    if (dto.interpreterRoleId) {
      await this.checkIfInterpreterExistsInOrder(appointmentOrder.matchedInterpreterIds, dto.interpreterRoleId);
      await this.appointmentOrderNotificationService.sendRepeatSingleNotification(
        dto.interpreterRoleId,
        appointmentOrder.platformId,
        { appointmentOrderId: appointmentOrder.id },
      );

      return { message: "Notification sent successfully" };
    } else {
      for (const interpreterId of appointmentOrder.matchedInterpreterIds) {
        await this.appointmentOrderNotificationService.sendRepeatSingleNotification(
          interpreterId,
          appointmentOrder.platformId,
          {
            appointmentOrderId: appointmentOrder.id,
          },
        );
      }

      return { message: "Notifications sent successfully" };
    }
  }

  public async sendRepeatNotificationToInterpretersGroup(
    platformId: string,
    dto: SendRepeatNotificationDto,
  ): Promise<MessageOutput> {
    const queryOptions =
      this.appointmentOrderQueryOptionsService.getSharedOrderGroupForRepeatAndAddInterpreterOptions(platformId);

    const appointmentOrderGroup = await findOneOrFail(
      platformId,
      this.appointmentOrderGroupRepository,
      queryOptions,
      "platformId",
    );

    if (dto.interpreterRoleId) {
      await this.checkIfInterpreterExistsInOrder(appointmentOrderGroup.matchedInterpreterIds, dto.interpreterRoleId);
      await this.appointmentOrderNotificationService.sendRepeatGroupNotification(
        dto.interpreterRoleId,
        appointmentOrderGroup.platformId,
        { appointmentOrderGroupId: appointmentOrderGroup.id },
      );

      return { message: "Notification sent successfully" };
    } else {
      for (const interpreterId of appointmentOrderGroup.matchedInterpreterIds) {
        await this.appointmentOrderNotificationService.sendRepeatGroupNotification(
          interpreterId,
          appointmentOrderGroup.platformId,
          {
            appointmentOrderGroupId: appointmentOrderGroup.id,
          },
        );
      }

      return { message: "Notifications sent successfully" };
    }
  }

  private async checkIfInterpreterExistsInOrder(matchedInterpreterIds: string[], interpreterId: string): Promise<void> {
    if (!matchedInterpreterIds.includes(interpreterId)) {
      throw new BadRequestException("Interpreter not added. Please add interpreter first.");
    }

    return;
  }

  public async addInterpreterToOrder(id: string, dto: AddInterpreterToOrderDto): Promise<MessageOutput> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(dto.interpreterRoleId);
    const interpreter = await findOneOrFail(dto.interpreterRoleId, this.userRoleRepository, interpreterOptions);

    const appointmentOrderOptions =
      this.appointmentOrderQueryOptionsService.getSharedOrderForRepeatAndAddInterpreterOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, appointmentOrderOptions);

    if (appointmentOrder.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      throw new BadRequestException("The appointment on-demand scheduling type is not permit to add interpreters.");
    }

    await this.checkIfInterpreterExistsInOrderAndUpdate(
      appointmentOrder,
      this.appointmentOrderRepository,
      interpreter.id,
    );

    await this.appointmentOrderNotificationService.sendRepeatSingleNotification(
      interpreter.id,
      appointmentOrder.platformId,
      {
        appointmentOrderId: appointmentOrder.id,
      },
    );

    return { message: "Interpreter added successfully" };
  }

  public async addInterpreterToOrderGroup(platformId: string, dto: AddInterpreterToOrderDto): Promise<MessageOutput> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(dto.interpreterRoleId);
    const interpreter = await findOneOrFail(dto.interpreterRoleId, this.userRoleRepository, interpreterOptions);

    const appointmentOrderOptions =
      this.appointmentOrderQueryOptionsService.getSharedOrderGroupForRepeatAndAddInterpreterOptions(platformId);
    const appointmentOrderGroup = await findOneOrFail(
      platformId,
      this.appointmentOrderGroupRepository,
      appointmentOrderOptions,
      "platformId",
    );

    await this.checkIfInterpreterExistsInOrderAndUpdate(
      appointmentOrderGroup,
      this.appointmentOrderGroupRepository,
      interpreter.id,
    );

    await this.appointmentOrderNotificationService.sendRepeatGroupNotification(
      dto.interpreterRoleId,
      appointmentOrderGroup.platformId,
      { appointmentOrderGroupId: appointmentOrderGroup.id },
    );

    return { message: "Interpreter added successfully" };
  }

  private async checkIfInterpreterExistsInOrderAndUpdate(
    entity: AppointmentOrder | AppointmentOrderGroup,
    repository: Repository<AppointmentOrder> | Repository<AppointmentOrderGroup>,
    interpreterId: string,
  ): Promise<void> {
    if (entity.matchedInterpreterIds.includes(interpreterId)) {
      throw new BadRequestException("Interpreter already added.");
    }

    await repository.update(entity.id, {
      matchedInterpreterIds: [...entity.matchedInterpreterIds, interpreterId],
    });
  }

  private async checkConflictingAppointmentsBeforeAccept(
    interpreter: ITokenUserData,
    appointments: Appointment[],
    ignoreConflicts: boolean | undefined,
  ): Promise<void> {
    const conflictingAppointments = await this.getConflictingAppointmentsBeforeAccept(
      interpreter.userRoleId,
      appointments,
    );

    if (conflictingAppointments.length === 0) {
      return;
    }

    if (!ignoreConflicts) {
      throw new BadRequestException({
        message: "The time you have selected is already reserved.",
        conflictingAppointments: conflictingAppointments,
      });
    }

    await this.cancelAllConflictingAppointments(interpreter, conflictingAppointments);
  }

  private async getConflictingAppointmentsBeforeAccept(
    interpreterId: string,
    appointments: Appointment[],
  ): Promise<Appointment[]> {
    if (appointments.length === 1) {
      return this.bookingSlotManagementService.findConflictingAppointmentsBeforeAccept(
        interpreterId,
        appointments[0].scheduledStartTime,
        appointments[0].scheduledEndTime,
      );
    }

    return this.bookingSlotManagementService.findConflictingAppointmentGroupBeforeAccept(interpreterId, appointments);
  }

  private async cancelAllConflictingAppointments(
    interpreter: ITokenUserData,
    conflictingAppointments: Appointment[],
  ): Promise<void> {
    const singleAppointments = conflictingAppointments.filter((appointment) => !appointment.isGroupAppointment);
    const groupAppointmentsDifferentInterpreter = conflictingAppointments.filter(
      (appointment) => appointment.isGroupAppointment && !appointment.sameInterpreter,
    );
    const groupAppointmentsSameInterpreter = conflictingAppointments.filter(
      (appointment) => appointment.isGroupAppointment && appointment.sameInterpreter,
    );

    if (singleAppointments.length > 0) {
      await this.cancelSingleAppointments(singleAppointments, interpreter);
    }

    if (groupAppointmentsDifferentInterpreter.length > 0) {
      await this.cancelSingleAppointments(groupAppointmentsDifferentInterpreter, interpreter);
    }

    if (groupAppointmentsSameInterpreter.length > 0) {
      await this.cancelGroupAppointmentsSameInterpreter(groupAppointmentsSameInterpreter, interpreter);
    }
  }

  private async cancelSingleAppointments(appointments: Appointment[], interpreter: ITokenUserData): Promise<void> {
    for (const appointment of appointments) {
      await this.appointmentCancelService.cancelAppointment(appointment.id, interpreter, {
        cancellationReason: DEFAULT_INTERPRETER_CANCELLATION_REASON,
      });
    }
  }

  private async cancelGroupAppointmentsSameInterpreter(
    appointments: Appointment[],
    interpreter: ITokenUserData,
  ): Promise<void> {
    const uniqueGroupIds: Set<string> = new Set(
      appointments
        .map((appointment) => appointment.appointmentsGroupId)
        .filter((appointmentsGroupId): appointmentsGroupId is string => appointmentsGroupId !== null),
    );

    for (const appointmentsGroupId of uniqueGroupIds) {
      await this.appointmentCancelService.cancelGroupAppointments(appointmentsGroupId, interpreter, {
        cancellationReason: DEFAULT_INTERPRETER_CANCELLATION_REASON,
      });
    }
  }
}
