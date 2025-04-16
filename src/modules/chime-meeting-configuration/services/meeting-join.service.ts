import { InjectRepository } from "@nestjs/typeorm";
import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AwsChimeSdkService } from "src/modules/aws-chime-sdk/aws-chime-sdk.service";
import { EAppointmentSchedulingType, EAppointmentStatus } from "src/modules/appointments/common/enums";
import { IJoinMeeting, IMeetingAttendee } from "src/modules/chime-meeting-configuration/common/interfaces";
import { findOneOrFail, isSameDay } from "src/common/utils";
import { CLIENT_ROLES, INTERPRETER_ROLES, NUMBER_OF_MILLISECONDS_IN_MINUTE } from "src/common/constants";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { LokiLogger } from "src/common/logger";
import { AttendeeManagementService, ChimeMeetingQueryService } from "src/modules/chime-meeting-configuration/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders-shared/services";
import { Appointment } from "src/modules/appointments/entities";

@Injectable()
export class MeetingJoinService {
  private readonly lokiLogger = new LokiLogger(MeetingJoinService.name);
  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly helperService: HelperService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryService,
    private readonly attendeeManagementService: AttendeeManagementService,
  ) {}

  public async joinMeetingAsSuperAdmin(appointmentId: string, currentUser: ITokenUserData): Promise<IJoinMeeting> {
    try {
      const queryOptions = this.chimeMeetingQueryService.getSuperAdminMeetingConfigOptions(appointmentId);
      const meetingConfig = await findOneOrFail(appointmentId, this.chimeMeetingConfigurationRepository, queryOptions);

      if (!meetingConfig.mediaRegion || !meetingConfig.meeting || !meetingConfig.chimeMeetingId) {
        this.lokiLogger.error(
          `Meeting in appointment Id:${meetingConfig.appointmentId} is not active, meetingConfig: ${JSON.stringify(meetingConfig)}`,
        );
        throw new BadRequestException("Meeting is not active");
      }

      const attendeeResponse = await this.processSuperAdminJoinLogic(
        meetingConfig,
        meetingConfig.appointment,
        currentUser,
      );

      return {
        Meeting: meetingConfig.meeting,
        Attendee: {
          ...attendeeResponse,
        },
      };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to join meeting as super admin: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to join meeting");
    }
  }

  private async processSuperAdminJoinLogic(
    meetingConfig: ChimeMeetingConfiguration,
    appointment: Appointment,
    currentUser: ITokenUserData,
  ): Promise<IMeetingAttendee> {
    const { appointmentAdminInfo, appointmentOrder } = appointment;
    await this.checkNeedToUpdateAppointmentStatus(appointment);

    if (appointmentAdminInfo?.isRedFlagEnabled) {
      await this.helperService.disableRedFlag(appointment);
    }

    if (appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND && appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    }

    return await this.attendeeManagementService.addSuperAdminToLiveMeeting(meetingConfig, currentUser);
  }

  public async joinOnDemandMeeting(appointmentOrder: AppointmentOrder, interpreter: UserRole): Promise<IJoinMeeting> {
    try {
      const queryOptions = this.chimeMeetingQueryService.getOnDemandMeetingConfigOptions(
        appointmentOrder.appointment.id,
      );
      const meetingConfig = await findOneOrFail(
        appointmentOrder.appointment.id,
        this.chimeMeetingConfigurationRepository,
        queryOptions,
      );

      if (!meetingConfig.mediaRegion || !meetingConfig.meeting || !meetingConfig.chimeMeetingId) {
        this.lokiLogger.error(
          `Meeting in appointment Id:${meetingConfig.appointmentId} is not active, meetingConfig: ${JSON.stringify(meetingConfig)}`,
        );
        throw new BadRequestException("Meeting is not active");
      }

      const attendeeResponse = await this.processOnDemandJoinLogic(meetingConfig, interpreter);

      return {
        Meeting: meetingConfig.meeting,
        Attendee: {
          ...attendeeResponse,
        },
      };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to join meeting as interpreter with id: ${interpreter.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to join meeting");
    }
  }

  private async processOnDemandJoinLogic(
    meetingConfig: ChimeMeetingConfiguration,
    interpreter: UserRole,
  ): Promise<IMeetingAttendee> {
    await this.checkNeedToUpdateAppointmentStatus(meetingConfig.appointment);

    return await this.attendeeManagementService.addInterpreterToOnDemandMeeting(meetingConfig, interpreter);
  }

  public async joinMeetingAsInternalUser(
    appointmentId: string,
    user: ITokenUserData,
    mediaRegion?: string,
  ): Promise<IJoinMeeting> {
    const queryOptions = this.chimeMeetingQueryService.getInternalUserMeetingConfigOptions(
      appointmentId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFail(appointmentId, this.chimeMeetingConfigurationRepository, queryOptions);

    const joinMeetingResponse = await this.joinMeeting(meetingConfig, user.userRoleId, mediaRegion);
    await this.processInternalUserJoinLogic(meetingConfig, user);

    return joinMeetingResponse;
  }

  private async processInternalUserJoinLogic(
    meetingConfig: ChimeMeetingConfiguration,
    user: ITokenUserData,
  ): Promise<void> {
    await this.checkNeedToUpdateAppointmentStatus(meetingConfig.appointment);

    if (meetingConfig.appointment.schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
      await this.updateOnlinePresence(meetingConfig, user);
    }
  }

  public async joinMeetingAsExternalUser(
    meetingConfigId: string,
    externalUserId: string,
    mediaRegion?: string,
  ): Promise<IJoinMeeting> {
    const queryOptions = this.chimeMeetingQueryService.getExternalUserMeetingConfigOptions(
      meetingConfigId,
      externalUserId,
    );
    const meetingConfig = await findOneOrFail(meetingConfigId, this.chimeMeetingConfigurationRepository, queryOptions);

    const joinMeetingResponse = await this.joinMeeting(meetingConfig, externalUserId, mediaRegion);
    await this.checkNeedToUpdateAppointmentStatus(meetingConfig.appointment);

    return joinMeetingResponse;
  }

  private async updateOnlinePresence(meetingConfig: ChimeMeetingConfiguration, user: ITokenUserData): Promise<void> {
    if (!meetingConfig.appointment.appointmentAdminInfo) {
      this.lokiLogger.error(
        `Cannot update online status. Appointment admin info not found, meetingConfig: ${JSON.stringify(meetingConfig)}.`,
      );

      return;
    }

    if (CLIENT_ROLES.includes(user.role) && [null, false].includes(meetingConfig.isClientWasOnlineInBooking)) {
      await this.helperService.updateClientOnlineMarking(
        meetingConfig.id,
        meetingConfig.appointment.appointmentAdminInfo.id,
      );
    }

    if (
      INTERPRETER_ROLES.includes(user.role) &&
      [null, false].includes(meetingConfig.isInterpreterWasOnlineInBooking)
    ) {
      await this.helperService.updateInterpreterOnlineMarking(
        meetingConfig.id,
        meetingConfig.appointment.appointmentAdminInfo.id,
      );
    }
  }

  private async checkNeedToUpdateAppointmentStatus(appointment: Appointment): Promise<void> {
    if (appointment.status !== EAppointmentStatus.LIVE) {
      await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.LIVE);
    }
  }

  private async joinMeeting(
    meetingConfig: ChimeMeetingConfiguration,
    userId: string,
    mediaRegion?: string,
  ): Promise<IJoinMeeting> {
    const currentTime = new Date();
    let isMeetingExpired = false;

    await this.checkMeetingStartTime(currentTime, meetingConfig.meetingScheduledStartTime);

    if (!meetingConfig.meetingLaunchTime || !meetingConfig.chimeMeetingId) {
      const newMeetingConfig = await this.createNewMeeting(meetingConfig, mediaRegion);

      return await this.prepareMeetingResponse(newMeetingConfig, userId);
    }

    isMeetingExpired = await this.isMeetingExpired(currentTime, meetingConfig.meetingLaunchTime);

    if (!isMeetingExpired) {
      await this.checkIfRecordingHasStarted(meetingConfig);

      return await this.prepareMeetingResponse(meetingConfig, userId);
    }

    const availableMeeting = await this.chimeSdkService.getMeeting(meetingConfig.chimeMeetingId);

    if (availableMeeting) {
      await this.checkIfRecordingHasStarted(meetingConfig);

      return await this.prepareMeetingResponse(meetingConfig, userId);
    } else {
      const newMeetingConfig = await this.createNewMeeting(meetingConfig, mediaRegion);

      return await this.prepareMeetingResponse(newMeetingConfig, userId);
    }
  }

  private async checkMeetingStartTime(currentTime: Date, meetingScheduledStartTime: Date): Promise<void> {
    const earliestMeetingStartTimeMinutes = 5;
    const earliestStartTime = new Date(
      meetingScheduledStartTime.getTime() - earliestMeetingStartTimeMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );

    if (!isSameDay(currentTime, earliestStartTime)) {
      throw new ForbiddenException("Meeting can only be started on the same day as the scheduled start time.");
    }

    if (currentTime < earliestStartTime) {
      throw new ForbiddenException(
        "Meeting can only be started no more than 5 minutes before the scheduled start time.",
      );
    }
  }

  private async isMeetingExpired(currentTime: Date, meetingLaunchTime: Date): Promise<boolean> {
    const meetingExpirationTimeMinutes = 4;
    const meetingExpirationTime = new Date(
      meetingLaunchTime.getTime() + meetingExpirationTimeMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );

    return currentTime >= meetingExpirationTime;
  }

  private async createNewMeeting(
    meetingConfig: ChimeMeetingConfiguration,
    mediaRegion?: string,
  ): Promise<ChimeMeetingConfiguration> {
    const meetingResponse = await this.chimeSdkService.createMeetingWithAttendees(meetingConfig, mediaRegion);

    if (
      !meetingResponse.Meeting ||
      !meetingResponse.Meeting.MeetingId ||
      !meetingResponse.Meeting.MediaPlacement ||
      !meetingResponse.Meeting.MediaRegion ||
      !meetingResponse.Attendees
    ) {
      this.lokiLogger.error(
        `Failed to create meeting for appointment Id: ${meetingConfig.appointmentId}: ${JSON.stringify(meetingResponse)}`,
      );
      throw new ServiceUnavailableException("Unable to create meeting");
    }

    const attendeesResponse = meetingResponse.Attendees;
    meetingConfig.chimeMeetingId = meetingResponse.Meeting.MeetingId;
    meetingConfig.meetingLaunchTime = new Date();
    meetingConfig.mediaRegion = meetingResponse.Meeting.MediaRegion;
    meetingConfig.meeting = meetingResponse.Meeting;

    for (const attendee of meetingConfig.attendees) {
      const matchingResponse = attendeesResponse.find(
        (response) => response.ExternalUserId === attendee.externalUserId,
      );

      if (matchingResponse && matchingResponse.AttendeeId && matchingResponse.JoinToken) {
        attendee.attendeeId = matchingResponse.AttendeeId;
        attendee.joinToken = matchingResponse.JoinToken;
      }

      if (!attendee.attendeeId || !attendee.joinToken) {
        this.lokiLogger.error(
          `Failed to create attendee for appointment Id: ${meetingConfig.appointmentId}, attendee: ${JSON.stringify(attendee)}`,
        );
        throw new ServiceUnavailableException("Unable to create attendee");
      }
    }

    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      chimeMeetingId: meetingConfig.chimeMeetingId,
      meetingLaunchTime: meetingConfig.meetingLaunchTime,
      mediaRegion: meetingConfig.mediaRegion,
      meeting: meetingConfig.meeting,
    });
    await this.attendeeRepository.save(meetingConfig.attendees);
    await this.startMediaCapturePipeline(meetingConfig);

    return meetingConfig;
  }

  private async checkIfRecordingHasStarted(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    if (!meetingConfig.callRecordingEnabled) {
      await this.startMediaCapturePipeline(meetingConfig);
    }
  }

  private async startMediaCapturePipeline(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    if (!meetingConfig.chimeMeetingId) {
      this.lokiLogger.error(`Chime meeting id not found, meetingConfig: ${JSON.stringify(meetingConfig)}`);
      throw new BadRequestException("Chime meeting id not found");
    }

    const pipeline = await this.chimeSdkService.startMediaCapturePipeline(meetingConfig.chimeMeetingId);

    if (!pipeline || !pipeline.MediaCapturePipeline) {
      this.lokiLogger.error(`Failed to start media capture pipeline, pipeline: ${JSON.stringify(pipeline)}`);
      throw new ServiceUnavailableException("Failed to join meeting");
    }

    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      callRecordingEnabled: true,
      mediaPipelineId: pipeline.MediaCapturePipeline.MediaPipelineId,
    });
  }

  private async prepareMeetingResponse(
    meetingConfig: ChimeMeetingConfiguration,
    userId: string,
  ): Promise<IJoinMeeting> {
    const currentAttendee = meetingConfig.attendees.find((attendee) => attendee.externalUserId === userId);

    if (!currentAttendee || !meetingConfig.chimeMeetingId || !meetingConfig.mediaRegion || !meetingConfig.meeting) {
      this.lokiLogger.error(`Unable to join meeting: ${JSON.stringify(meetingConfig)}`);
      throw new ServiceUnavailableException("Unable to join meeting");
    }

    await this.attendeeRepository.update(currentAttendee.id, {
      isOnline: true,
    });

    return {
      Meeting: meetingConfig.meeting,
      Attendee: { ...currentAttendee, isOnline: true },
    };
  }
}
