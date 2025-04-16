import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment, AppointmentReminder } from "src/modules/appointments/entities";
import { Repository } from "typeorm";
import { findOneOrFail } from "src/common/utils";
import { DiscountsService } from "src/modules/discounts/services";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { MessagingManagementService } from "src/modules/chime-messaging-configuration/services";
import { IAppointmentDetails } from "src/modules/appointments/common/interfaces";
import { NotificationService } from "src/modules/notifications/services";

@Injectable()
export class AppointmentFailedPaymentCancelService {
  private readonly logger = new Logger(AppointmentFailedPaymentCancelService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    private readonly discountsService: DiscountsService,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly notificationService: NotificationService,
  ) {}

  public async cancelAppointmentPaymentFailed(id: string): Promise<void> {
    const appointment = await findOneOrFail(id, this.appointmentRepository, {
      select: {
        id: true,
        status: true,
        platformId: true,
        interpreterId: true,
        appointmentReminder: { id: true },
        chimeMeetingConfiguration: { id: true },
        appointmentOrder: { id: true, appointmentOrderGroup: { id: true, appointmentOrders: { id: true } } },
      },
      where: { id: id },
      relations: {
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
      },
    });
    await this.cleanupDataAndCancelAppointment(appointment);
  }

  public async cancelGroupAppointmentsPaymentFailed(appointmentsGroupId: string): Promise<void> {
    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        status: true,
        platformId: true,
        interpreterId: true,
        appointmentReminder: { id: true },
        chimeMeetingConfiguration: { id: true },
        appointmentOrder: { id: true, appointmentOrderGroup: { id: true, appointmentOrders: { id: true } } },
      },
      where: { appointmentsGroupId: appointmentsGroupId },
      relations: {
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
      },
    });

    for (const appointment of appointments) {
      await this.cleanupDataAndCancelAppointment(appointment);
    }
  }

  private async cleanupDataAndCancelAppointment(appointment: Appointment): Promise<void> {
    await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.CANCELLED_ORDER });
    await this.appointmentReminderRepository.remove(appointment.appointmentReminder);
    await this.discountsService.processDiscountAssociationIfExists(appointment.id);

    if (appointment.appointmentOrder) {
      await this.handleOrderRemoval(appointment.appointmentOrder);
    }

    if (appointment.chimeMeetingConfiguration) {
      await this.chimeMeetingConfigurationRepository.remove(appointment.chimeMeetingConfiguration);
    }

    if (appointment.status === EAppointmentStatus.ACCEPTED) {
      await this.messagingManagementService.handleChannelResolveProcess(appointment.id);

      if (appointment.interpreterId) {
        await this.sendClientCanceledAppointmentNotification(appointment.interpreterId, appointment.platformId, {
          appointmentId: appointment.id,
        });
      }
    }
  }

  private async handleOrderRemoval(appointmentOrder: AppointmentOrder): Promise<void> {
    await this.appointmentOrderRepository.remove(appointmentOrder);

    const { appointmentOrderGroup } = appointmentOrder;

    if (!appointmentOrderGroup) {
      return;
    }

    const appointmentOrdersLeft = await this.appointmentOrderRepository.count({
      where: { appointmentOrderGroupId: appointmentOrderGroup.id },
    });

    if (appointmentOrdersLeft === 0) {
      await this.appointmentOrderGroupRepository.remove(appointmentOrderGroup);
    }
  }

  private async sendClientCanceledAppointmentNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetails,
  ): Promise<void> {
    this.notificationService
      .sendClientCanceledAppointmentNotification(interpreterId, platformId, appointmentDetails)
      .catch((error) => {
        this.logger.error(
          `Failed to send single client canceled appointment notification for userRoleId: ${interpreterId}`,
          error,
        );
      });
  }
}
