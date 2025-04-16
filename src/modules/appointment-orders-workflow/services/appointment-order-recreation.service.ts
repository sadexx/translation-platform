import { BadRequestException, forwardRef, Inject, Injectable } from "@nestjs/common";
import { Appointment } from "src/modules/appointments/entities";
import {
  CreateFaceToFaceAppointmentDto,
  CreateVirtualAppointmentDto,
  UpdateAppointmentDto,
} from "src/modules/appointments/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppointmentCreateService, AppointmentUpdateService } from "src/modules/appointments/services";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { AppointmentOrderCreateService } from "src/modules/appointment-orders-workflow/services";
import { ICompanyInfo } from "src/modules/appointments/common/interfaces";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { EPayInStatus } from "src/modules/payments/common/enums";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { IRecreatedAppointmentWithOldAppointment } from "src/modules/appointment-orders/common/interface";
import { LokiLogger } from "src/common/logger";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointment-failed-payment-cancel/services";
import { findOneOrFail } from "src/common/utils";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders-shared/services";

@Injectable()
export class AppointmentOrderRecreationService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderRecreationService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @Inject(forwardRef(() => AppointmentCreateService))
    private readonly appointmentCreateService: AppointmentCreateService,
    @Inject(forwardRef(() => AppointmentUpdateService))
    private readonly appointmentUpdateService: AppointmentUpdateService,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentOrderCreateService: AppointmentOrderCreateService,
    private readonly generalPaymentsService: GeneralPaymentsService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
  ) {}

  public async handleOrderRecreationForUpdatedAppointment(
    updatedAppointment: Appointment,
    dto: UpdateAppointmentDto,
    oldAppointment: Appointment,
    isAddressUpdate: boolean = false,
  ): Promise<void> {
    const relations = this.appointmentOrderQueryOptionsService.getUpdatedAppointmentsRelations();
    const newAppointment = await findOneOrFail(updatedAppointment.id, this.appointmentRepository, {
      where: { id: updatedAppointment.id },
      relations: relations,
    });

    if (newAppointment.appointmentsGroupId) {
      await this.handleGroupRecreationForUpdatedAppointment(newAppointment, dto, isAddressUpdate, oldAppointment);
    } else {
      await this.recreateIndividualOrder(newAppointment, oldAppointment);
    }
  }

  private async handleGroupRecreationForUpdatedAppointment(
    updatedAppointment: Appointment,
    dto: UpdateAppointmentDto,
    isAddressUpdate: boolean,
    oldAppointment: Appointment,
  ): Promise<void> {
    if (!updatedAppointment.appointmentsGroupId) {
      throw new BadRequestException("Appointment order group not found.");
    }

    const queryOptions = this.appointmentOrderQueryOptionsService.getGroupRecreationOptions(
      updatedAppointment.appointmentsGroupId,
    );
    const appointmentGroup = await this.appointmentRepository.find(queryOptions);

    if (
      dto.topic ||
      dto.preferredInterpreterGender ||
      dto.languageFrom ||
      dto.languageTo ||
      updatedAppointment.sameInterpreter
    ) {
      return await this.recreateFullGroupForUpdatedAppointment(appointmentGroup, updatedAppointment, dto);
    }

    if (
      (dto.schedulingDurationMin || dto.scheduledStartTime || isAddressUpdate) &&
      !updatedAppointment.sameInterpreter
    ) {
      return await this.recreateOrderInGroup(appointmentGroup, updatedAppointment, oldAppointment);
    }
  }

  private async recreateFullGroupForUpdatedAppointment(
    appointmentGroup: Appointment[],
    updatedAppointment: Appointment,
    dto: UpdateAppointmentDto,
  ): Promise<void> {
    const appointmentsToRecreate = appointmentGroup.filter((appointment) => appointment.id !== updatedAppointment.id);
    const recreatedAppointments: Appointment[] = [updatedAppointment];

    const recreatedAppointmentsWithOldAppointments: IRecreatedAppointmentWithOldAppointment[] = [];

    for (const appointment of appointmentsToRecreate) {
      let appointmentToRecreate: Appointment = appointment;

      if (appointmentToRecreate.interpreter && appointmentToRecreate.status === EAppointmentStatus.ACCEPTED) {
        appointmentToRecreate = await this.appointmentCreateService.recreateAppointment(appointment);
        await this.appointmentUpdateService.cleanupOldAppointment(appointment);
      }

      recreatedAppointments.push(appointmentToRecreate);

      const changedRecreatedAppointment = Object.assign({}, appointmentToRecreate, {
        topic: dto.topic,
        preferredInterpreterGender: dto.preferredInterpreterGender,
        languageFrom: dto.languageFrom,
        languageTo: dto.languageTo,
      });

      recreatedAppointmentsWithOldAppointments.push({
        oldAppointment: appointment,
        recreatedAppointment: changedRecreatedAppointment,
      });
    }

    const { appointmentsGroupId } = updatedAppointment;

    if (appointmentsGroupId) {
      await this.appointmentRepository.update(
        { appointmentsGroupId: appointmentsGroupId, status: EAppointmentStatus.PENDING },
        {
          topic: dto.topic,
          preferredInterpreterGender: dto.preferredInterpreterGender,
          languageFrom: dto.languageFrom,
          languageTo: dto.languageTo,
        },
      );
    }

    const appointmentWithGroup = appointmentGroup.find(
      (appointment) => appointment.appointmentOrder && appointment.appointmentOrder.appointmentOrderGroupId,
    );

    if (appointmentWithGroup && appointmentWithGroup.appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        appointmentWithGroup.appointmentOrder.appointmentOrderGroup,
      );
    }

    const firstAppointment = recreatedAppointments[0] as CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto;

    const companyInfo = await this.appointmentCreateService.constructCompanyInfo(
      firstAppointment as unknown as ICompanyInfo,
    );

    const newAppointmentOrderGroup = await this.appointmentOrderCreateService.constructAndCreateAppointmentOrderGroup(
      {
        ...firstAppointment,
      },
      companyInfo,
    );

    for (const appointment of recreatedAppointments) {
      const updatedAppointment = await this.appointmentRepository.findOne({
        where: { id: appointment.id },
      });

      await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
        updatedAppointment!,
        appointment.client!,
        appointment.address,
        newAppointmentOrderGroup,
      );
    }

    if (appointmentsGroupId && appointmentsGroupId !== newAppointmentOrderGroup.platformId) {
      await this.updateAppointmentsGroupId(appointmentsGroupId, newAppointmentOrderGroup);
    }

    await this.appointmentOrderCreateService.calculateTimeFramesForOrderGroup(newAppointmentOrderGroup.id);

    await this.paymentAuthAndSearchTriggerGroup(recreatedAppointmentsWithOldAppointments, newAppointmentOrderGroup.id);
  }

  public async handleOrderRecreationForCancelledAppointment(
    appointmentEntity: Appointment | Appointment[],
  ): Promise<void> {
    if (Array.isArray(appointmentEntity)) {
      await this.recreateGroupForCancelledAppointments(appointmentEntity);
    } else {
      await this.handleOrderInGroupOrIndividualRecreation(appointmentEntity, appointmentEntity);
    }
  }

  private async handleOrderInGroupOrIndividualRecreation(
    appointmentEntity: Appointment,
    oldAppointment: Appointment,
  ): Promise<void> {
    if (appointmentEntity.appointmentsGroupId && !appointmentEntity.sameInterpreter) {
      const queryOptions = this.appointmentOrderQueryOptionsService.getCancelAppointmentGroupRecreationOptions(
        appointmentEntity.appointmentsGroupId,
      );
      const appointmentGroup = await this.appointmentRepository.find(queryOptions);

      await this.recreateOrderInGroup(appointmentGroup, appointmentEntity, oldAppointment);
    } else if (!appointmentEntity.appointmentsGroupId) {
      await this.recreateIndividualOrder(appointmentEntity, oldAppointment);
    }
  }

  private async recreateGroupForCancelledAppointments(appointmentGroup: Appointment[]): Promise<void> {
    const firstAppointment = appointmentGroup[0];

    const queryOptions = this.appointmentOrderQueryOptionsService.getPendingAppointmentsWithoutInterpreterOptions(
      firstAppointment.appointmentsGroupId!,
    );
    const pendingAppointmentsWithoutInterpreter = await this.appointmentRepository.find(queryOptions);
    const appointmentWithOrderGroup = pendingAppointmentsWithoutInterpreter.find(
      (appointment) => appointment.appointmentOrder && appointment.appointmentOrder.appointmentOrderGroup,
    );

    if (appointmentWithOrderGroup && appointmentWithOrderGroup.appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        appointmentWithOrderGroup.appointmentOrder.appointmentOrderGroup,
      );
    }

    const companyInfo = await this.appointmentCreateService.constructCompanyInfo(
      firstAppointment as unknown as ICompanyInfo,
    );
    const newAppointmentOrderGroup = await this.appointmentOrderCreateService.constructAndCreateAppointmentOrderGroup(
      { ...(firstAppointment as CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto) },
      companyInfo,
    );

    for (const appointment of pendingAppointmentsWithoutInterpreter) {
      await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
        appointment,
        appointment.client!,
        appointment.address,
        newAppointmentOrderGroup,
      );
    }

    await this.updateAppointmentsGroupId(firstAppointment.appointmentsGroupId!, newAppointmentOrderGroup);

    await this.appointmentOrderCreateService.calculateTimeFramesForOrderGroup(newAppointmentOrderGroup.id);
    await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrderGroup(
      newAppointmentOrderGroup.id,
    );
  }

  private async recreateOrderInGroup(
    appointmentGroup: Appointment[],
    appointment: Appointment,
    oldAppointment: Appointment,
  ): Promise<void> {
    const { appointmentsGroupId } = appointment;

    const appointmentWithOrderGroup = appointmentGroup.find(
      (appointment) => appointment.appointmentOrder && appointment.appointmentOrder.appointmentOrderGroup,
    );

    if (appointmentWithOrderGroup && appointmentWithOrderGroup.appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        appointmentWithOrderGroup.appointmentOrder.appointmentOrderGroup,
      );
    }

    const queryOptions = this.appointmentOrderQueryOptionsService.getPendingAppointmentsWithoutInterpreterOptions(
      appointmentsGroupId!,
    );
    const pendingAppointmentsWithoutInterpreter = await this.appointmentRepository.find(queryOptions);

    if (pendingAppointmentsWithoutInterpreter.length > 0) {
      const firstAppointment = pendingAppointmentsWithoutInterpreter[0] as
        | CreateVirtualAppointmentDto
        | CreateFaceToFaceAppointmentDto;

      const companyInfo = await this.appointmentCreateService.constructCompanyInfo(
        firstAppointment as unknown as ICompanyInfo,
      );

      const newAppointmentOrderGroup = await this.appointmentOrderCreateService.constructAndCreateAppointmentOrderGroup(
        {
          ...firstAppointment,
        },
        companyInfo,
      );

      for (const appointment of pendingAppointmentsWithoutInterpreter) {
        await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
          appointment,
          appointment.client!,
          appointment.address,
          newAppointmentOrderGroup,
        );
      }

      if (appointmentsGroupId && appointmentsGroupId !== newAppointmentOrderGroup.platformId) {
        await this.updateAppointmentsGroupId(appointmentsGroupId, newAppointmentOrderGroup);
      }

      await this.appointmentOrderCreateService.calculateTimeFramesForOrderGroup(newAppointmentOrderGroup.id);

      await this.paymentAuthAndSearchTriggerIndividual(appointment, oldAppointment, newAppointmentOrderGroup.id);
    }
  }

  private async recreateIndividualOrder(newAppointment: Appointment, oldAppointment: Appointment): Promise<void> {
    const appointmentOrder = (await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
      newAppointment,
      newAppointment.client!,
      newAppointment.address,
    )) as AppointmentOrder;

    await this.paymentAuthAndSearchTriggerIndividual(newAppointment, oldAppointment, appointmentOrder.id);
  }

  private async updateAppointmentsGroupId(
    oldAppointmentsGroupId: string,
    newAppointmentOrderGroup: AppointmentOrderGroup,
  ): Promise<void> {
    await this.appointmentRepository.update(
      { appointmentsGroupId: oldAppointmentsGroupId },
      {
        appointmentsGroupId: newAppointmentOrderGroup.platformId,
      },
    );
    await this.channelRepository.update(
      { appointmentsGroupId: oldAppointmentsGroupId },
      {
        appointmentsGroupId: newAppointmentOrderGroup.platformId,
      },
    );
  }

  private async paymentAuthAndSearchTriggerIndividual(
    appointment: Appointment,
    oldAppointment: Appointment,
    appointmentOrderId: string,
  ): Promise<void> {
    const paymentSuccess = await this.generalPaymentsService
      .makePayInAuthIfAppointmentRecreated(appointment, oldAppointment)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to make payin, appointmentId: ${appointment.id}`, error.stack);
        this.appointmentFailedPaymentCancelService
          .cancelAppointmentPaymentFailed(appointment.id)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to cancel payin auth: ${error.message}, appointmentId: ${appointment.id}`,
              error.stack,
            );

            return EPayInStatus.AUTHORIZATION_FAILED;
          });

        return EPayInStatus.AUTHORIZATION_FAILED;
      });

    if (
      paymentSuccess === EPayInStatus.AUTHORIZATION_SUCCESS ||
      paymentSuccess === EPayInStatus.REDIRECTED_TO_WAIT_LIST ||
      paymentSuccess === EPayInStatus.PAY_IN_REATTACHED ||
      paymentSuccess === EPayInStatus.PAY_IN_NOT_CHANGED
    ) {
      return await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrderGroup(
        appointmentOrderId,
      );
    }

    this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(appointment.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to cancel payin auth: ${error.message}, appointmentId: ${appointment.id}`,
        error.stack,
      );
    });
  }

  private async paymentAuthAndSearchTriggerGroup(
    appointments: IRecreatedAppointmentWithOldAppointment[],
    appointmentOrderGroupId: string,
  ): Promise<void> {
    let paymentStatus: EPayInStatus | null = null;

    for (const appointment of appointments) {
      const paymentSuccess = await this.generalPaymentsService
        .makePayInAuthIfAppointmentRecreated(appointment.recreatedAppointment, appointment.oldAppointment)
        .catch((error: Error) => {
          this.lokiLogger.error("Failed to make payin:", error.stack);

          return EPayInStatus.AUTHORIZATION_FAILED;
        });

      if (paymentSuccess === EPayInStatus.AUTHORIZATION_FAILED) {
        paymentStatus = paymentSuccess;
      }

      if (
        paymentSuccess === EPayInStatus.AUTHORIZATION_SUCCESS &&
        paymentStatus !== EPayInStatus.AUTHORIZATION_FAILED
      ) {
        paymentStatus = paymentSuccess;
      }

      if (
        (paymentSuccess === EPayInStatus.REDIRECTED_TO_WAIT_LIST ||
          paymentSuccess === EPayInStatus.PAY_IN_NOT_CHANGED ||
          paymentSuccess === EPayInStatus.PAY_IN_REATTACHED) &&
        paymentStatus !== EPayInStatus.AUTHORIZATION_FAILED &&
        paymentStatus !== EPayInStatus.AUTHORIZATION_SUCCESS
      ) {
        paymentStatus = paymentSuccess;
      }
    }

    if (
      paymentStatus === EPayInStatus.AUTHORIZATION_SUCCESS ||
      paymentStatus === EPayInStatus.REDIRECTED_TO_WAIT_LIST ||
      paymentStatus === EPayInStatus.PAY_IN_REATTACHED ||
      paymentStatus === EPayInStatus.PAY_IN_NOT_CHANGED
    ) {
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrderGroup(appointmentOrderGroupId);
    } else {
      if (appointments[0].oldAppointment.appointmentsGroupId) {
        const oldAppointments = appointments.map((appointment) => appointment.oldAppointment);

        this.generalPaymentsService.cancelPayInAuthForGroup(oldAppointments).catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to cancel payin auth: ${error.message}, appointmentGroupId: ${appointments[0].oldAppointment.appointmentsGroupId}`,
            error.stack,
          );
        });

        this.appointmentFailedPaymentCancelService
          .cancelGroupAppointmentsPaymentFailed(appointments[0].oldAppointment.appointmentsGroupId)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to cancel payin auth: ${error.message}, appointmentGroupId: ${appointments[0].oldAppointment.appointmentsGroupId}`,
              error.stack,
            );
          });
      }
    }
  }
}
