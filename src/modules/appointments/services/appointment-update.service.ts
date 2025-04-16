import { InjectRepository } from "@nestjs/typeorm";
import { UpdateAppointmentDto, UpdateAppointmentSearchConditionsDto } from "src/modules/appointments/common/dto";
import { Appointment } from "src/modules/appointments/entities";
import { FindOneOptions, Repository } from "typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  EAppointmentCommunicationType,
  EAppointmentParticipantType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import {
  AppointmentCommandService,
  AppointmentCreateService,
  AppointmentNotificationService,
} from "src/modules/appointments/services";
import { AttendeeCreationService, MeetingCreationService } from "src/modules/chime-meeting-configuration/services";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";
import { isUUID } from "validator";
import { MessagingManagementService } from "src/modules/chime-messaging-configuration/services";
import { findOneOrFail } from "src/common/utils";
import { AppointmentOrderRecreationService } from "src/modules/appointment-orders-workflow/services";
import { ILiveAppointmentCacheData } from "src/modules/appointments/common/interfaces";
import {
  DEFAULT_EMPTY_VALUE,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_THREE_MINUTES,
  NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import { Address } from "src/modules/addresses/entities";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { addMinutes } from "date-fns";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { BookingSlotManagementService } from "src/modules/booking-slot-management/services";
import { DiscountsService } from "src/modules/discounts/services";
import { HelperService } from "src/modules/helper/services";
import { MembershipAssignmentsService } from "src/modules/memberships/services";
import { LokiLogger } from "src/common/logger";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { EPayInStatus, EPaymentFailedReason } from "src/modules/payments/common/enums";
import { MultiWayParticipantService } from "src/modules/multi-way-participant/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders-shared/services";
import { RedisService } from "src/modules/redis/services";

export class AppointmentUpdateService {
  private readonly lokiLogger = new LokiLogger(AppointmentUpdateService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly meetingCreationService: MeetingCreationService,
    private readonly attendeeCreationService: AttendeeCreationService,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentCreateService: AppointmentCreateService,
    private readonly appointmentsCommandService: AppointmentCommandService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentOrderRecreationService: AppointmentOrderRecreationService,
    private readonly bookingSlotManagementService: BookingSlotManagementService,
    private readonly discountsService: DiscountsService,
    private readonly helperService: HelperService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly generalPaymentsService: GeneralPaymentsService,
    private readonly multiWayParticipantService: MultiWayParticipantService,
    private readonly redisService: RedisService,
  ) {}

  public async updateAppointment(id: string, dto: UpdateAppointmentDto, user: ITokenUserData): Promise<MessageOutput> {
    const queryOptions = await this.determineRoleForEditing(id, user);
    const relations = this.appointmentQueryOptionsService.getUpdatedAppointmentsRelations();

    const appointment = await findOneOrFail(id, this.appointmentRepository, { ...queryOptions, relations: relations });

    if (appointment.status !== EAppointmentStatus.ACCEPTED && appointment.status !== EAppointmentStatus.PENDING) {
      throw new BadRequestException("The appointment cannot be updated in its current state.");
    }

    await this.helperService.isAppointmentChangesRestrictedByTimeLimits(appointment, dto);

    if (dto.scheduledStartTime || dto.schedulingDurationMin) {
      await this.checkConflictAppointmentsBeforeUpdate(
        user.userRoleId,
        appointment.id,
        dto.scheduledStartTime ?? appointment.scheduledStartTime,
        dto.schedulingDurationMin ?? appointment.schedulingDurationMin,
      );
    }

    if (dto.participantType) {
      await this.handleParticipantTypeUpdate(dto, appointment);
    }

    if (appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      await this.updateFaceToFaceAppointment(appointment, dto);
    } else {
      await this.updateVirtualAppointment(appointment, dto);
    }

    return { message: "Appointment updated successfully." };
  }

  private async determineRoleForEditing(id: string, user: ITokenUserData): Promise<FindOneOptions<Appointment>> {
    if (
      user.role === EUserRoleName.IND_CLIENT ||
      user.role === EUserRoleName.CORPORATE_CLIENTS_IND_USER ||
      user.role === EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER
    ) {
      return {
        where: { id: id, clientId: user.userRoleId },
      };
    } else {
      return {
        where: { id: id },
      };
    }
  }

  private async checkConflictAppointmentsBeforeUpdate(
    clientId: string,
    appointmentId: string,
    scheduledStartTime: Date,
    schedulingDurationMin: number,
  ): Promise<void> {
    const conflictingAppointments = await this.bookingSlotManagementService.findConflictingAppointmentsBeforeUpdate(
      clientId,
      appointmentId,
      scheduledStartTime,
      schedulingDurationMin,
    );

    if (conflictingAppointments.length > 0) {
      throw new BadRequestException({
        message: "The time you have selected is already reserved.",
        conflictingAppointments: conflictingAppointments,
      });
    }
  }

  private async updateFaceToFaceAppointment(appointment: Appointment, dto: UpdateAppointmentDto): Promise<void> {
    const orderNeedsRecreation = this.orderNeedsRecreation(appointment, dto);

    if (orderNeedsRecreation) {
      await this.recreateAppointmentAndHandleOrderRecreation(appointment, dto);
    } else {
      await this.updateAppointmentData(appointment, dto);

      if (appointment.interpreterId) {
        await this.appointmentNotificationService.sendUpdatedNotification(
          appointment.interpreterId,
          appointment.platformId,
          { appointmentId: appointment.id },
        );
      }
    }
  }

  private async updateVirtualAppointment(appointment: Appointment, dto: UpdateAppointmentDto): Promise<void> {
    const orderNeedsRecreation = this.orderNeedsRecreation(appointment, dto);
    let appointmentToUpdate: Appointment = appointment;

    if (orderNeedsRecreation) {
      appointmentToUpdate = await this.recreateAppointmentAndHandleOrderRecreation(appointment, dto);
    } else {
      await this.updateAppointmentData(appointmentToUpdate, dto);

      if (appointment.interpreterId) {
        await this.appointmentNotificationService.sendUpdatedNotification(
          appointment.interpreterId,
          appointment.platformId,
          { appointmentId: appointment.id },
        );
      }
    }

    if (dto.alternativePlatform || appointmentToUpdate.alternativePlatform) {
      if (appointmentToUpdate.chimeMeetingConfiguration) {
        await this.helperService.deleteChimeMeetingWithAttendees(appointmentToUpdate.chimeMeetingConfiguration);
      }
    }

    if (
      !dto.alternativePlatform &&
      !appointmentToUpdate.alternativePlatform &&
      !appointmentToUpdate.chimeMeetingConfiguration
    ) {
      await this.setupMeetingConfiguration(appointmentToUpdate);
    }
  }

  private async recreateAppointmentAndHandleOrderRecreation(
    appointment: Appointment,
    dto: UpdateAppointmentDto,
    isAddressUpdate: boolean = false,
  ): Promise<Appointment> {
    let appointmentToUpdate: Appointment = appointment;
    const oldAppointment = Object.assign({}, appointment);

    if (appointmentToUpdate.interpreter && appointmentToUpdate.status === EAppointmentStatus.ACCEPTED) {
      appointmentToUpdate = await this.appointmentCreateService.recreateAppointment(appointment);
    }

    if (appointment.interpreterId) {
      await this.appointmentNotificationService.sendCancelledNotification(
        appointment.interpreterId,
        appointment.platformId,
        { appointmentId: appointment.id },
      );
    }

    await this.cleanupOldAppointment(appointment);
    const updatedAppointment = await this.updateAppointmentData(appointmentToUpdate, dto);

    await this.appointmentOrderRecreationService.handleOrderRecreationForUpdatedAppointment(
      updatedAppointment,
      dto,
      oldAppointment,
      isAddressUpdate,
    );

    return updatedAppointment;
  }

  public async cleanupOldAppointment(appointment: Appointment): Promise<void> {
    await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.CANCELLED);
    await this.helperService.deleteAppointmentReminder(appointment.appointmentReminder);
    await this.discountsService.processDiscountAssociationIfExists(appointment.id);

    if (appointment.chimeMeetingConfiguration && appointment.interpreterId) {
      await this.helperService.deleteChimeMeetingWithAttendees(appointment.chimeMeetingConfiguration);
    }

    if (!appointment.isGroupAppointment && appointment.appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointment.appointmentOrder);
    }

    await this.messagingManagementService.handleChannelResolveProcess(appointment.id);
  }

  private async updateAppointmentData(appointment: Appointment, dto: UpdateAppointmentDto): Promise<Appointment> {
    const determinedScheduledStartTime = dto.scheduledStartTime ?? appointment.scheduledStartTime;
    const determinedSchedulingDurationMin = dto.schedulingDurationMin ?? appointment.schedulingDurationMin;
    const determinedScheduledEndTime = addMinutes(determinedScheduledStartTime, determinedSchedulingDurationMin);
    const determinedPlatformLink =
      dto.alternativePlatform !== false
        ? (dto.alternativeVideoConferencingPlatformLink ?? appointment.alternativeVideoConferencingPlatformLink)
        : null;

    Object.assign(appointment, {
      ...dto,
      participants: appointment.participants,
      scheduledEndTime: determinedScheduledEndTime,
      alternativeVideoConferencingPlatformLink: determinedPlatformLink,
    });

    if (dto.scheduledStartTime && appointment.chimeMeetingConfiguration) {
      await this.meetingCreationService.updateMeetingStartTime(
        appointment.chimeMeetingConfiguration,
        dto.scheduledStartTime,
      );
    }

    return await this.appointmentRepository.save(appointment);
  }

  private async handleParticipantTypeUpdate(dto: UpdateAppointmentDto, appointment: Appointment): Promise<void> {
    if (dto.participantType === appointment.participantType) {
      return;
    }

    if (dto.participantType === EAppointmentParticipantType.TWO_WAY) {
      await this.multiWayParticipantService.removeAllParticipantsFromAppointment(appointment);
      Object.assign(appointment, {
        participantType: EAppointmentParticipantType.TWO_WAY,
        participants: [],
      });
    }
  }

  public async setupMeetingConfiguration(appointment: Appointment): Promise<void> {
    const meetingConfig = await this.meetingCreationService.constructAndCreateMeetingConfiguration(
      appointment,
      appointment.participants?.length ?? 0,
    );

    await this.attendeeCreationService.constructAndCreateAttendees(
      appointment.client!,
      appointment.participants ?? [],
      appointment,
      meetingConfig,
      appointment.interpreter ?? DEFAULT_EMPTY_VALUE,
    );

    appointment.chimeMeetingConfiguration = meetingConfig;
  }

  private orderNeedsRecreation(appointment: Appointment, dto: UpdateAppointmentDto): boolean {
    switch (true) {
      case dto.scheduledStartTime && dto.scheduledStartTime !== appointment.scheduledStartTime:
        return true;

      case dto.schedulingDurationMin && dto.schedulingDurationMin !== appointment.schedulingDurationMin:
        return true;

      case dto.topic && dto.topic !== appointment.topic:
        return true;

      case dto.preferredInterpreterGender && dto.preferredInterpreterGender !== appointment.preferredInterpreterGender:
        return true;

      case dto.languageFrom && dto.languageFrom !== appointment.languageFrom:
        return true;

      case dto.languageTo && dto.languageTo !== appointment.languageTo:
        return true;

      default:
        return false;
    }
  }

  public async updateAppointmentSearchConditions(
    id: string,
    dto: UpdateAppointmentSearchConditionsDto,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getUpdateAppointmentSearchConditionsOptions(
      id,
      user.userRoleId,
    );
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);
    const appointmentUpdatePayload: Partial<Appointment> = {};
    const appointmentOrderUpdatePayload: Partial<AppointmentOrder> = {
      isFirstSearchCompleted: false,
    };

    if (dto.topic) {
      appointmentUpdatePayload.topic = dto.topic;
      appointmentOrderUpdatePayload.topic = dto.topic;
    }

    if (dto.preferredInterpreterGender !== undefined) {
      appointmentUpdatePayload.preferredInterpreterGender = dto.preferredInterpreterGender;
      appointmentOrderUpdatePayload.preferredInterpreterGender = dto.preferredInterpreterGender;
    }

    if (!appointment.isGroupAppointment) {
      await this.appointmentRepository.update({ id: appointment.id }, appointmentUpdatePayload);
      await this.appointmentOrderSharedLogicService.updateActiveOrderConditions(
        appointment,
        appointmentOrderUpdatePayload,
      );
    } else {
      await this.appointmentRepository.update(
        { appointmentsGroupId: appointment.appointmentsGroupId! },
        appointmentUpdatePayload,
      );
      await this.appointmentOrderSharedLogicService.updateActiveOrderConditions(
        appointment,
        appointmentOrderUpdatePayload,
      );
    }

    return { message: "Appointment search conditions updated successfully" };
  }

  public async handleAppointmentAddressUpdate(address: Address): Promise<void> {
    const { appointment } = address;

    if (!appointment) {
      throw new NotFoundException("Address has no associated appointment.");
    }

    const isAddressUpdate = true;
    await this.helperService.isAppointmentChangesRestrictedByTimeLimits(
      appointment,
      {} as UpdateAppointmentDto,
      isAddressUpdate,
    );

    const updatedAddress = { ...address };
    delete updatedAddress.appointment;
    appointment.address = updatedAddress;

    if (appointment.interpreter) {
      await this.recreateAppointmentAndHandleOrderRecreation(appointment, {} as UpdateAppointmentDto, isAddressUpdate);
    } else {
      if (!appointment.isGroupAppointment && appointment.appointmentOrder) {
        await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointment.appointmentOrder);
      }

      await this.appointmentOrderRecreationService.handleOrderRecreationForUpdatedAppointment(
        appointment,
        {} as UpdateAppointmentDto,
        appointment,
        isAddressUpdate,
      );
    }
  }

  public async handleUpdateAppointmentBusinessTime(id: string, user: ITokenUserData): Promise<MessageOutput> {
    const CACHE_KEY = `live-appointment-data:${id}`;
    const liveAppointmentCacheData = await this.redisService.getJson<ILiveAppointmentCacheData>(CACHE_KEY);

    if (!liveAppointmentCacheData) {
      throw new BadRequestException("Invalid data.");
    }

    const { appointment } = liveAppointmentCacheData;

    const businessExtensionTime = this.appointmentsCommandService.getBusinessExtensionTimeInMinutes(appointment);
    const availableFreeMinutes =
      await this.membershipAssignmentsService.calculateAvailableFreeMinutesForBusinessExtensionTimes(
        user.userRoleId,
        businessExtensionTime,
        appointment,
      );

    this.makePayInAndUpdateBusinessTime(
      liveAppointmentCacheData,
      businessExtensionTime,
      availableFreeMinutes,
      user.userRoleId,
      CACHE_KEY,
    ).catch((error: Error) => {
      this.lokiLogger.error("Make payin by additional block error", error.stack);
    });

    return { message: "Success" };
  }

  private async makePayInAndUpdateBusinessTime(
    liveAppointmentCacheData: ILiveAppointmentCacheData,
    businessExtensionTime: number,
    availableFreeMinutes: number,
    userRoleId: string,
    CACHE_KEY: string,
  ): Promise<void> {
    const { appointment } = liveAppointmentCacheData;

    const paymentStatus = await this.generalPaymentsService
      .makePayInAuthByAdditionalBlock(liveAppointmentCacheData, businessExtensionTime, availableFreeMinutes)
      .catch(async (error: Error) => {
        this.lokiLogger.error(`Failed to make payin: ${error.message}, appointmentId: ${appointment.id}`, error.stack);

        return EPayInStatus.AUTHORIZATION_FAILED;
      });

    if (paymentStatus === EPayInStatus.AUTHORIZATION_SUCCESS) {
      await this.updateBusinessEndTime(appointment, businessExtensionTime, availableFreeMinutes, userRoleId, CACHE_KEY);
    } else {
      if (appointment.clientId) {
        await this.appointmentNotificationService.sendAppointmentPaymentFailedNotification(
          appointment.clientId,
          appointment.platformId,
          EPaymentFailedReason.AUTH_FAILED,
          { appointmentId: appointment.id },
        );
      }
    }
  }

  private async updateBusinessEndTime(
    appointment: Appointment,
    businessExtensionTime: number,
    availableFreeMinutes: number,
    clientId: string,
    cacheKey: string,
  ): Promise<void> {
    const baseTime = appointment.businessEndTime ?? appointment.scheduledEndTime;
    const newBusinessEndTime = addMinutes(baseTime, businessExtensionTime);

    await this.appointmentRepository.update(
      { id: appointment.id, clientId: clientId, status: EAppointmentStatus.LIVE },
      { businessEndTime: newBusinessEndTime },
    );

    await this.redisService.del(cacheKey);
    await this.membershipAssignmentsService.deductFreeMinutes(availableFreeMinutes, appointment);
  }

  public async updateAppointmentActivityTime(id: string, user: IWebSocketUserData): Promise<{ message: string }> {
    if (!isUUID(id)) {
      throw new BadRequestException("Invalid appointment id.");
    }

    await this.appointmentRepository.update(
      { id, clientId: user.userRoleId, status: EAppointmentStatus.LIVE },
      { clientLastActiveTime: new Date() },
    );

    this.handleLiveAppointmentCacheData(id).catch((error: Error) =>
      this.lokiLogger.error("Error handling live appointment cache data.", error.stack),
    );

    return { message: "Success" };
  }

  private async handleLiveAppointmentCacheData(id: string): Promise<void> {
    const CACHE_KEY = `live-appointment-data:${id}`;
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR * NUMBER_OF_SECONDS_IN_MINUTE;

    let liveAppointmentCacheData = await this.redisService.getJson<ILiveAppointmentCacheData>(CACHE_KEY);

    if (!liveAppointmentCacheData) {
      const appointment = await findOneOrFail(id, this.appointmentRepository, { where: { id } });
      liveAppointmentCacheData = { appointment, isEndingSoonPushSent: false };
      await this.redisService.setJson(CACHE_KEY, liveAppointmentCacheData, CACHE_TTL);
    }

    if (!liveAppointmentCacheData.isEndingSoonPushSent) {
      const notificationSent = await this.handleSendLiveAppointmentEndingSoonNotification(
        liveAppointmentCacheData.appointment,
      );

      if (notificationSent) {
        Object.assign(liveAppointmentCacheData, {
          isEndingSoonPushSent: true,
          extensionPeriodStart:
            liveAppointmentCacheData.appointment.businessEndTime ??
            liveAppointmentCacheData.appointment.scheduledEndTime,
        });
        await this.redisService.setJson(CACHE_KEY, liveAppointmentCacheData, CACHE_TTL);
      }
    }
  }

  private async handleSendLiveAppointmentEndingSoonNotification(appointment: Appointment): Promise<boolean> {
    if (!appointment.clientId) {
      return false;
    }

    const currentDate = new Date();
    const fiveMinutesLater = addMinutes(currentDate, NUMBER_OF_MINUTES_IN_FIVE_MINUTES);
    const threeMinutesLater = addMinutes(currentDate, NUMBER_OF_MINUTES_IN_THREE_MINUTES);

    if (appointment.businessEndTime) {
      const businessEndTime = new Date(appointment.businessEndTime);

      if (businessEndTime < threeMinutesLater) {
        await this.appointmentNotificationService.sendLiveAppointmentEndingSoonNotification(
          appointment.clientId,
          appointment.platformId,
          { appointmentId: appointment.id },
        );

        return true;
      }

      return false;
    }

    const scheduledEndTime = new Date(appointment.scheduledEndTime);

    if (scheduledEndTime < fiveMinutesLater) {
      await this.appointmentNotificationService.sendLiveAppointmentEndingSoonNotification(
        appointment.clientId,
        appointment.platformId,
        { appointmentId: appointment.id },
      );

      return true;
    }

    return false;
  }
}
