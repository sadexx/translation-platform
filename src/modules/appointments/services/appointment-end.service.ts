import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment, AppointmentEndDetail } from "src/modules/appointments/entities";
import { Repository } from "typeorm";
import { EndAppointmentDto } from "src/modules/appointments/common/dto";
import { EAppointmentAlternativeTimeType, EAppointmentStatus } from "src/modules/appointments/common/enums";
import { IAppointmentEndDetails, IAppointmentFinalizedScheduleTimes } from "src/modules/appointments/common/interfaces";
import { addMinutes, isAfter, isBefore } from "date-fns";
import { UserRole } from "src/modules/users-roles/entities";
import { HelperService } from "src/modules/helper/services";
import { AppointmentNotificationService, AppointmentRatingService } from "src/modules/appointments/services";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { findOneOrFail } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessagingManagementService } from "src/modules/chime-messaging-configuration/services";
import { DiscountsService } from "src/modules/discounts/services";
import { ADMIN_ROLES } from "src/common/constants";

@Injectable()
export class AppointmentEndService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentEndDetail)
    private readonly appointmentEndDetailsRepository: Repository<AppointmentEndDetail>,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentRatingService: AppointmentRatingService,
    private readonly helperService: HelperService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly discountsService: DiscountsService,
  ) {}

  public async endCompletedAppointment(id: string, dto: EndAppointmentDto, user: ITokenUserData): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getEndCompletedAppointmentOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (appointment.status !== EAppointmentStatus.COMPLETED_ACTION_REQUIRED) {
      throw new BadRequestException("The appointment cannot be ended in its current state.");
    }

    if (appointment.clientId && appointment.clientId === user.userRoleId) {
      await this.endCompletedAppointmentByClient(appointment, dto, user);
    }

    if (appointment.interpreterId && appointment.interpreterId === user.userRoleId) {
      await this.endCompletedAppointmentByInterpreter(appointment, dto, user);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      await this.endCompletedAppointmentByAdmin(appointment, dto, user);
    }

    return;
  }

  private async endCompletedAppointmentByClient(
    appointment: Appointment,
    dto: EndAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    if (!appointment.appointmentEndDetail?.clientSignature && !dto.clientSignature) {
      throw new BadRequestException("Client signature is not provided.");
    }

    const appointmentEndDetail = await this.createOrUpdateAppointmentEndDetails(appointment, dto, user);

    if (dto.clientAlternativeScheduledStartTime && !appointmentEndDetail.interpreterSignature) {
      await this.sendTimeUpdateNotification(appointment, user);
    }

    if (appointmentEndDetail.clientSignature && appointmentEndDetail.interpreterSignature) {
      await this.finalizeCompletedAppointment(appointment, appointmentEndDetail);
    }
  }

  private async endCompletedAppointmentByInterpreter(
    appointment: Appointment,
    dto: EndAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    if (!appointment.appointmentEndDetail?.interpreterSignature && !dto.interpreterSignature) {
      throw new BadRequestException("Interpreter signature is not provided.");
    }

    const appointmentEndDetail = await this.createOrUpdateAppointmentEndDetails(appointment, dto, user);

    if (dto.interpreterAlternativeScheduledStartTime && !appointmentEndDetail.clientSignature) {
      await this.sendTimeUpdateNotification(appointment, user);
    }

    if (appointmentEndDetail.clientSignature && appointmentEndDetail.interpreterSignature) {
      await this.finalizeCompletedAppointment(appointment, appointmentEndDetail);
    }
  }

  private async endCompletedAppointmentByAdmin(
    appointment: Appointment,
    dto: EndAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    if (!dto.adminSignature) {
      throw new BadRequestException("Admin signature is not provided.");
    }

    const adminUserRole = await this.helperService.getUserRoleById(user.userRoleId, {
      role: true,
      profile: true,
      user: true,
    });
    const appointmentEndDetail = await this.createOrUpdateAppointmentEndDetails(appointment, dto, user, adminUserRole);

    await this.finalizeCompletedAppointment(appointment, appointmentEndDetail);
  }

  private async createOrUpdateAppointmentEndDetails(
    appointment: Appointment,
    dto: EndAppointmentDto,
    user: ITokenUserData,
    adminInfo?: UserRole,
  ): Promise<AppointmentEndDetail> {
    const queryOptions = this.appointmentQueryOptionsService.getCreateOrUpdateAppointmentEndDetailsOptions(
      appointment.id,
    );
    const existingDetails = await this.appointmentEndDetailsRepository.findOne(queryOptions);
    const appointmentEndDetailDto = await this.constructAppointmentEndDetailDto(dto, existingDetails, adminInfo);

    if (
      dto.clientAlternativeScheduledStartTime ||
      dto.interpreterAlternativeScheduledStartTime ||
      dto.adminAlternativeScheduledStartTime
    ) {
      await this.processAndValidateTimeUpdate(appointment, dto, user, existingDetails, appointmentEndDetailDto);
    }

    if (existingDetails) {
      return await this.updateAppointmentEndDetail(existingDetails, appointmentEndDetailDto);
    } else {
      return await this.createAppointmentEndDetail(appointment, appointmentEndDetailDto);
    }
  }

  private async updateAppointmentEndDetail(
    existingDetails: AppointmentEndDetail,
    dto: IAppointmentEndDetails,
  ): Promise<AppointmentEndDetail> {
    await this.appointmentEndDetailsRepository.update(existingDetails.id, dto);

    const updateAppointmentEndDetails = await findOneOrFail(existingDetails.id, this.appointmentEndDetailsRepository, {
      where: { id: existingDetails.id },
    });

    return updateAppointmentEndDetails;
  }

  private async createAppointmentEndDetail(
    appointment: Appointment,
    dto: IAppointmentEndDetails,
  ): Promise<AppointmentEndDetail> {
    const newDetails = this.appointmentEndDetailsRepository.create({
      appointment,
      ...dto,
    });
    const savedDetails = await this.appointmentEndDetailsRepository.save(newDetails);

    return savedDetails;
  }

  private async constructAppointmentEndDetailDto(
    dto: EndAppointmentDto,
    existingDetails: AppointmentEndDetail | null,
    adminInfo?: UserRole,
  ): Promise<IAppointmentEndDetails> {
    return {
      ...existingDetails,
      ...dto,
      adminRoleName: adminInfo?.role.name,
      adminFirstName: adminInfo?.profile.firstName,
      adminPlatformId: adminInfo?.user.platformId,
    };
  }

  private async processAndValidateTimeUpdate(
    appointment: Appointment,
    dto: EndAppointmentDto,
    user: ITokenUserData,
    existingDetails: AppointmentEndDetail | null,
    updateData: IAppointmentEndDetails,
  ): Promise<void> {
    await this.validateAlternativeTime(appointment, dto);
    const isUserClient = appointment.clientId === user.userRoleId;
    const isUserInterpreter = appointment.interpreterId === user.userRoleId;

    if (
      (!isUserClient && dto.clientAlternativeScheduledStartTime) ||
      (!isUserInterpreter && dto.interpreterAlternativeScheduledStartTime)
    ) {
      throw new BadRequestException("You can only update your own alternative times on your device.");
    }

    if (
      (isUserClient && existingDetails?.clientTimeUpdated && dto.clientAlternativeScheduledStartTime) ||
      (isUserInterpreter && existingDetails?.interpreterTimeUpdated && dto.interpreterAlternativeScheduledStartTime)
    ) {
      throw new BadRequestException("You can only update the time once.");
    }

    if (isUserClient && dto.clientAlternativeScheduledStartTime) {
      Object.assign(updateData, {
        interpreterSignature: dto.interpreterSignature ?? null,
        clientTimeUpdated: true,
        isClientTimeLatest: true,
      });
    }

    if (isUserInterpreter && dto.interpreterAlternativeScheduledStartTime) {
      Object.assign(updateData, {
        clientSignature: dto.clientSignature ?? null,
        interpreterTimeUpdated: true,
        isClientTimeLatest: false,
      });
    }

    return;
  }

  private async sendTimeUpdateNotification(appointment: Appointment, user: ITokenUserData): Promise<void> {
    if (appointment.clientId && appointment.interpreterId && appointment.clientId === user.userRoleId) {
      await this.appointmentNotificationService.sendClientUpdatedTimeNotification(
        appointment.interpreterId,
        appointment.platformId,
        { appointmentId: appointment.id },
      );
    }

    if (appointment.interpreterId && appointment.clientId && appointment.interpreterId === user.userRoleId) {
      await this.appointmentNotificationService.sendInterpreterUpdatedTimeNotification(
        appointment.clientId,
        appointment.platformId,
        { appointmentId: appointment.id },
      );
    }

    return;
  }

  public async finalizeCompletedAppointment(
    appointment: Appointment,
    appointmentEndDetail: AppointmentEndDetail,
  ): Promise<void> {
    const { scheduledStartTime, scheduledEndTime } = this.getFinalizedScheduleTimes(appointment, appointmentEndDetail);

    if (!scheduledStartTime || !scheduledEndTime) {
      throw new BadRequestException(`Cant define finalized times for appointment with id ${appointment.id}`);
    }

    const businessEndTime = this.calculateBusinessEndTime(
      scheduledStartTime,
      scheduledEndTime,
      appointment.schedulingDurationMin,
    );

    await this.appointmentRepository.update(appointment.id, {
      status: EAppointmentStatus.COMPLETED,
      businessEndTime,
      scheduledStartTime,
      scheduledEndTime,
    });

    await this.appointmentRatingService.createAppointmentRating(appointment);
    await this.discountsService.processDiscountAssociationIfExists(appointment.id);
    await this.messagingManagementService.handleChannelResolveProcess(appointment.id);
  }

  private getFinalizedScheduleTimes(
    appointment: Appointment,
    appointmentEndDetail: AppointmentEndDetail,
  ): IAppointmentFinalizedScheduleTimes {
    const alternativeTimeType = this.getAlternativeTimeType(appointmentEndDetail);

    switch (alternativeTimeType) {
      case EAppointmentAlternativeTimeType.ADMIN_ALTERNATIVE_TIME: {
        return {
          scheduledStartTime: appointmentEndDetail.adminAlternativeScheduledStartTime,
          scheduledEndTime: appointmentEndDetail.adminAlternativeScheduledEndTime,
        };
      }
      case EAppointmentAlternativeTimeType.CLIENT_AND_INTERPRETER_ALTERNATIVE_TIME: {
        const isClientTimeLatest = appointmentEndDetail.isClientTimeLatest;

        return {
          scheduledStartTime: isClientTimeLatest
            ? appointmentEndDetail.clientAlternativeScheduledStartTime
            : appointmentEndDetail.interpreterAlternativeScheduledStartTime,
          scheduledEndTime: isClientTimeLatest
            ? appointmentEndDetail.clientAlternativeScheduledEndTime
            : appointmentEndDetail.interpreterAlternativeScheduledEndTime,
        };
      }
      case EAppointmentAlternativeTimeType.CLIENT_ALTERNATIVE_TIME: {
        return {
          scheduledStartTime: appointmentEndDetail.clientAlternativeScheduledStartTime,
          scheduledEndTime: appointmentEndDetail.clientAlternativeScheduledEndTime,
        };
      }
      case EAppointmentAlternativeTimeType.INTERPRETER_ALTERNATIVE_TIME: {
        return {
          scheduledStartTime: appointmentEndDetail.interpreterAlternativeScheduledStartTime,
          scheduledEndTime: appointmentEndDetail.interpreterAlternativeScheduledEndTime,
        };
      }
      default: {
        return {
          scheduledStartTime: appointment.scheduledStartTime,
          scheduledEndTime: appointment.scheduledEndTime,
        };
      }
    }
  }

  private getAlternativeTimeType(appointmentEndDetail: AppointmentEndDetail): EAppointmentAlternativeTimeType {
    const adminProvidedAlternativeTimes =
      appointmentEndDetail.adminAlternativeScheduledStartTime && appointmentEndDetail.adminAlternativeScheduledEndTime;
    const clientProvidedAlternativeTimes =
      appointmentEndDetail.clientAlternativeScheduledStartTime &&
      appointmentEndDetail.clientAlternativeScheduledEndTime;
    const interpreterProvidedAlternativeTimes =
      appointmentEndDetail.interpreterAlternativeScheduledStartTime &&
      appointmentEndDetail.interpreterAlternativeScheduledEndTime;

    if (adminProvidedAlternativeTimes) {
      return EAppointmentAlternativeTimeType.ADMIN_ALTERNATIVE_TIME;
    } else if (clientProvidedAlternativeTimes && interpreterProvidedAlternativeTimes) {
      return EAppointmentAlternativeTimeType.CLIENT_AND_INTERPRETER_ALTERNATIVE_TIME;
    } else if (clientProvidedAlternativeTimes) {
      return EAppointmentAlternativeTimeType.CLIENT_ALTERNATIVE_TIME;
    } else if (interpreterProvidedAlternativeTimes) {
      return EAppointmentAlternativeTimeType.INTERPRETER_ALTERNATIVE_TIME;
    }

    return EAppointmentAlternativeTimeType.DEFAULT_TIME;
  }

  private calculateBusinessEndTime(
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    schedulingDurationMin: number,
  ): Date {
    const expectedBusinessEndTime = addMinutes(scheduledStartTime, schedulingDurationMin);

    return isAfter(scheduledEndTime, expectedBusinessEndTime) ? scheduledEndTime : expectedBusinessEndTime;
  }

  public async finalizeChimeVirtualAppointment(appointment: Appointment): Promise<void> {
    const updatePayload: Partial<Appointment> = {
      status: EAppointmentStatus.COMPLETED,
    };

    if (!appointment.businessEndTime) {
      updatePayload.businessEndTime = appointment.scheduledEndTime;
    }

    await this.appointmentRepository.update(appointment.id, updatePayload);

    if (!appointment.appointmentRating) {
      await this.appointmentRatingService.createAppointmentRating(appointment);
    }

    if (appointment.channelId) {
      await this.messagingManagementService.handleChannelResolveProcess(appointment.id);
    }
  }

  private async validateAlternativeTime(appointment: Appointment, dto: EndAppointmentDto): Promise<void> {
    const alternativeTimePairs = [
      { startTime: dto.clientAlternativeScheduledStartTime, endTime: dto.clientAlternativeScheduledEndTime },
      { startTime: dto.interpreterAlternativeScheduledStartTime, endTime: dto.interpreterAlternativeScheduledEndTime },
      { startTime: dto.adminAlternativeScheduledStartTime, endTime: dto.adminAlternativeScheduledEndTime },
    ];

    for (const { startTime, endTime } of alternativeTimePairs) {
      if (startTime && endTime) {
        if (isBefore(startTime, appointment.scheduledStartTime)) {
          throw new BadRequestException(
            "Alternative start time cannot be earlier than the original scheduled start time.",
          );
        }
      }
    }
  }
}
