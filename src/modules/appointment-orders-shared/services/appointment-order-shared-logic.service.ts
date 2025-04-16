import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { ICancelOnDemandInvitation } from "src/modules/appointment-orders/common/interface";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { Appointment } from "src/modules/appointments/entities";
import { NotificationService } from "src/modules/notifications/services";
import { Repository } from "typeorm";
import { AppointmentOrderQueryOptionsService } from "src/modules/appointment-orders-shared/services";

@Injectable()
export class AppointmentOrderSharedLogicService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderSharedLogicService.name);

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly notificationService: NotificationService,
  ) {}

  public async triggerLaunchSearchForIndividualOrder(id: string): Promise<void> {
    await this.appointmentOrderRepository.update(id, {
      isSearchNeeded: true,
    });
  }

  public async triggerLaunchSearchForIndividualOrderGroup(id: string): Promise<void> {
    await this.appointmentOrderGroupRepository.update(id, {
      isSearchNeeded: true,
    });
  }

  public async updateActiveOrderConditions(
    appointment: Appointment,
    orderUpdatePayload: Partial<AppointmentOrder>,
  ): Promise<void> {
    if (!appointment.isGroupAppointment) {
      if (!appointment.appointmentOrder) {
        throw new BadRequestException("Appointment Order cannot be updated because it missing in Appointment");
      }

      await this.appointmentOrderRepository.update({ id: appointment.appointmentOrder.id }, orderUpdatePayload);

      await this.triggerLaunchSearchForIndividualOrder(appointment.appointmentOrder.id);
    } else {
      const groupId = appointment.appointmentsGroupId;
      const appointmentOrderGroupId = appointment.appointmentOrder?.appointmentOrderGroup?.id;

      if (!groupId || !appointmentOrderGroupId) {
        throw new BadRequestException("Group appointments cannot be updated; missing group IDs");
      }

      await this.appointmentOrderRepository.update(
        { appointmentOrderGroup: { id: appointmentOrderGroupId } },
        orderUpdatePayload,
      );

      await this.triggerLaunchSearchForIndividualOrderGroup(appointmentOrderGroupId);
    }
  }

  public async removeGroupAndAssociatedOrders(appointmentOrderGroup: AppointmentOrderGroup): Promise<void> {
    if (!appointmentOrderGroup) {
      throw new NotFoundException(`Appointment order group not found.`);
    }

    await this.removeAppointmentOrderBatch(appointmentOrderGroup.appointmentOrders);
    await this.deleteAppointmentOrderGroupIfEmpty(appointmentOrderGroup.id);
  }

  public async deleteAppointmentOrderGroupIfEmpty(id: string, isPlatform: boolean = false): Promise<void> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getDeleteAppointmentOrderGroupOptions(id, isPlatform);
    const appointmentOrderGroup = await this.appointmentOrderGroupRepository.findOne(queryOptions);

    if (appointmentOrderGroup && appointmentOrderGroup.appointmentOrders.length === 0) {
      await this.appointmentOrderGroupRepository.remove(appointmentOrderGroup);
    }
  }

  public async removeAppointmentOrderBatch(appointmentOrder: AppointmentOrder | AppointmentOrder[]): Promise<void> {
    if (Array.isArray(appointmentOrder)) {
      if (appointmentOrder.length === 0) {
        throw new NotFoundException(`Appointment order not found.`);
      }

      await this.appointmentOrderRepository.remove(appointmentOrder);
    } else {
      if (!appointmentOrder) {
        throw new NotFoundException(`Appointment order not found.`);
      }

      await this.appointmentOrderRepository.remove(appointmentOrder);
    }
  }

  public async cancelOnDemandCalls(appointmentOrder: AppointmentOrder, interpreterId?: string): Promise<void> {
    const { platformId, matchedInterpreterIds, appointment } = appointmentOrder;
    const updatedInterpreterIds = matchedInterpreterIds.filter((id) => id !== interpreterId).sort();

    for (const otherInterpreterId of updatedInterpreterIds) {
      await this.sendCanceledOnDemandCallNotification(otherInterpreterId, platformId, {
        appointmentId: appointment.id,
      });
    }
  }

  public async sendCanceledOnDemandCallNotification(
    clientId: string,
    platformId: string,
    cancelOnDemandInvitation: ICancelOnDemandInvitation,
  ): Promise<void> {
    this.notificationService
      .sendCancelOnDemandInvitationForAppointmentNotification(clientId, platformId, cancelOnDemandInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send accepted appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }
}
