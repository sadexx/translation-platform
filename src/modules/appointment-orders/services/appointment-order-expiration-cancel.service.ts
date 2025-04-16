import { InjectRepository } from "@nestjs/typeorm";
import { ObjectLiteral, Repository } from "typeorm";
import { Appointment, AppointmentReminder } from "src/modules/appointments/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { AppointmentOrderNotificationService } from "src/modules/appointment-orders/services";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { NotFoundException } from "@nestjs/common";
import { MeetingClosingService } from "src/modules/chime-meeting-configuration/services";
import { findOneOrFail } from "src/common/utils";
import { HelperService } from "src/modules/helper/services";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders-shared/services";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments-shared/common/constants";

export class AppointmentOrderExpirationCancelService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    private readonly meetingClosingService: MeetingClosingService,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentOrderNotificationService: AppointmentOrderNotificationService,
    private readonly helperService: HelperService,
  ) {}

  public async cancelExpiredAppointmentOrder(appointmentOrder: AppointmentOrder): Promise<void> {
    const appointmentId = appointmentOrder.appointment.id;
    const queryOptions = this.appointmentOrderQueryOptionsService.getCancelAppointmentBySystemOptions(appointmentId);
    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, queryOptions);

    const clientId = appointment.clientId;

    if (!clientId) {
      throw new NotFoundException(`Client not found for appointment with id: ${appointmentId}.`);
    }

    appointment.appointmentOrder = appointmentOrder;

    const { appointmentReminder, chimeMeetingConfiguration } = await this.processSingleAppointment(appointment);
    await this.deleteEntitiesBatch(appointmentReminder, this.appointmentReminderRepository);

    if (chimeMeetingConfiguration) {
      await this.deleteEntitiesBatch(chimeMeetingConfiguration, this.chimeMeetingConfigurationRepository);

      if (
        appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND &&
        AUDIO_VIDEO_COMMUNICATION_TYPES.includes(appointment.communicationType)
      ) {
        await this.meetingClosingService.deleteAwsChimeMeeting(chimeMeetingConfiguration);
      }
    }

    if (appointment.appointmentAdminInfo?.isRedFlagEnabled) {
      await this.helperService.disableRedFlag(appointment);
    }

    await this.removeAppointmentOrders(appointmentOrder);
    await this.updateAppointmentStatusesBatch(appointmentId);
    await this.appointmentOrderNotificationService.sendCanceledNotification(clientId, appointment.platformId, false, {
      appointmentId: appointmentId,
    });
  }

  public async cancelExpiredGroupAppointmentOrders(appointmentOrderGroup: AppointmentOrderGroup): Promise<void> {
    const { platformId, sameInterpreter } = appointmentOrderGroup;

    const queryOptions = this.appointmentOrderQueryOptionsService.getCancelAppointmentOrderGroup(platformId);
    const appointments = await this.appointmentRepository.find(queryOptions);

    const firstAppointment = appointments[0];
    const singleClientId = firstAppointment.clientId;

    if (!singleClientId) {
      throw new NotFoundException(`Client not found for appointment with id: ${firstAppointment.id}.`);
    }

    const { appointmentsReminders, appointmentsChimeMeetings, appointmentOrders, appointmentsIds } =
      await this.collectEntitiesForDeletion(appointments);
    await this.deleteEntitiesBatch(appointmentsReminders, this.appointmentReminderRepository);

    if (appointmentsChimeMeetings.length > 0) {
      await this.deleteEntitiesBatch(appointmentsChimeMeetings, this.chimeMeetingConfigurationRepository);
    }

    if (appointments.some((appointment) => appointment.appointmentAdminInfo?.isRedFlagEnabled)) {
      await this.helperService.disableRedFlag(appointments);
    }

    await this.removeAppointmentOrders(appointmentOrders);
    await this.updateAppointmentStatusesBatch(appointmentsIds);
    await this.removeOrderGroup(platformId);
    await this.appointmentOrderNotificationService.sendCanceledNotification(singleClientId, platformId, true, {
      appointmentsGroupId: platformId,
    });

    if (!sameInterpreter) {
      for (const appointment of appointments) {
        if (appointment.interpreterId) {
          await this.appointmentOrderNotificationService.sendCanceledNotification(
            appointment.interpreterId,
            appointment.platformId,
            false,
            {
              appointmentId: appointment.id,
            },
          );
        } else {
          continue;
        }
      }
    }
  }

  private async collectEntitiesForDeletion(appointments: Appointment[]): Promise<{
    appointmentsReminders: AppointmentReminder[];
    appointmentsChimeMeetings: ChimeMeetingConfiguration[];
    appointmentOrders: AppointmentOrder[];
    appointmentsIds: string[];
  }> {
    const appointmentsReminders: AppointmentReminder[] = [];
    const appointmentsChimeMeetings: ChimeMeetingConfiguration[] = [];
    const appointmentOrders: AppointmentOrder[] = [];
    const appointmentsIds: string[] = [];

    for (const appointment of appointments) {
      const { appointmentReminder, chimeMeetingConfiguration, appointmentOrder, appointmentId } =
        await this.processSingleAppointment(appointment);

      appointmentsReminders.push(appointmentReminder);
      appointmentOrders.push(appointmentOrder);
      appointmentsIds.push(appointmentId);

      if (chimeMeetingConfiguration) {
        appointmentsChimeMeetings.push(chimeMeetingConfiguration);
      }
    }

    return { appointmentsReminders, appointmentsChimeMeetings, appointmentOrders, appointmentsIds };
  }

  private async processSingleAppointment(appointment: Appointment): Promise<{
    appointmentReminder: AppointmentReminder;
    chimeMeetingConfiguration?: ChimeMeetingConfiguration;
    appointmentOrder: AppointmentOrder;
    appointmentId: string;
  }> {
    const {
      appointmentReminder,
      chimeMeetingConfiguration,
      appointmentOrder,
      id,
      alternativePlatform,
      communicationType,
    } = appointment;

    await this.ensureEntityExists(appointmentReminder, "AppointmentReminder", appointment.id);
    await this.ensureEntityExists(appointmentOrder, "AppointmentOrder", appointment.id);

    let validChimeMeetingConfiguration: ChimeMeetingConfiguration | undefined = undefined;

    if (!alternativePlatform && communicationType !== EAppointmentCommunicationType.FACE_TO_FACE) {
      await this.ensureEntityExists(chimeMeetingConfiguration, "ChimeMeetingConfiguration", appointment.id);

      validChimeMeetingConfiguration = chimeMeetingConfiguration;
    }

    return {
      appointmentReminder: appointmentReminder,
      chimeMeetingConfiguration: validChimeMeetingConfiguration,
      appointmentOrder,
      appointmentId: id,
    };
  }

  private async ensureEntityExists(
    entity: ObjectLiteral | undefined,
    entityName: string,
    appointmentId: string,
  ): Promise<void> {
    if (entity) {
      return;
    }

    throw new NotFoundException(
      `Failed to cancel appointment. ${entityName} is missing for appointment with Id: ${appointmentId}.`,
    );
  }

  private async deleteEntitiesBatch<T extends ObjectLiteral>(
    entities: T | T[],
    repository: Repository<T>,
  ): Promise<void> {
    const entitiesArray = Array.isArray(entities) ? entities : [entities];

    if (entitiesArray.length === 0) {
      throw new NotFoundException(`Entities not found for deletion.`);
    }

    await repository.remove(entitiesArray);
  }

  private async updateAppointmentStatusesBatch(id: string | string[]): Promise<void> {
    await this.appointmentRepository.update(id, { status: EAppointmentStatus.CANCELLED_BY_SYSTEM });
  }

  private async removeAppointmentOrders(appointmentOrder: AppointmentOrder | AppointmentOrder[]): Promise<void> {
    await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
  }

  private async removeOrderGroup(platformId: string): Promise<void> {
    await this.appointmentOrderSharedLogicService.deleteAppointmentOrderGroupIfEmpty(platformId, true);
  }
}
