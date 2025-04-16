import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AwsChimeSdkService } from "src/modules/aws-chime-sdk/aws-chime-sdk.service";
import { EAppointmentSchedulingType, EAppointmentStatus } from "src/modules/appointments/common/enums";
import { AppointmentCommandService } from "src/modules/appointments/services";
import { findOneOrFail } from "src/common/utils";
import { MessageOutput } from "src/common/outputs";
import { DiscountsService } from "src/modules/discounts/services";
import { HelperService } from "src/modules/helper/services";
import { LokiLogger } from "src/common/logger";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { ChimeMeetingQueryService } from "src/modules/chime-meeting-configuration/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders-shared/services";

@Injectable()
export class MeetingClosingService {
  private readonly lokiLogger = new LokiLogger(MeetingClosingService.name);

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    private readonly appointmentCommandService: AppointmentCommandService,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly discountsService: DiscountsService,
    private readonly helperService: HelperService,
    private readonly generalPaymentsService: GeneralPaymentsService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryService,
  ) {}

  public async leaveMeeting(meetingConfigId: string, attendeeId: string): Promise<MessageOutput> {
    const result = await this.attendeeRepository.update(
      { chimeMeetingConfigurationId: meetingConfigId, attendeeId: attendeeId },
      { isOnline: false },
    );

    if (!result.affected || result.affected === 0) {
      this.lokiLogger.error(
        `Failed to update status in attendee Id: ${attendeeId} at meeting-config Id: ${meetingConfigId}`,
      );
      throw new NotFoundException("Failed to update attendee status.");
    } else {
      return { message: "Successfully left meeting" };
    }
  }

  public async closeMeeting(chimeMeetingId: string): Promise<MessageOutput> {
    try {
      const queryOptions = this.chimeMeetingQueryService.getChimeMeetingForClosingOptions(chimeMeetingId);
      const meetingConfig = await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);

      if (!meetingConfig.chimeMeetingId || !meetingConfig.appointment.appointmentReminder) {
        this.lokiLogger.error(
          `Meeting Id: ${chimeMeetingId} not found meetingConfig: ${JSON.stringify(meetingConfig)}`,
        );
        throw new NotFoundException("Meeting not found");
      }

      const { schedulingType, appointmentAdminInfo, appointmentOrder } = meetingConfig.appointment;

      if (
        schedulingType === EAppointmentSchedulingType.ON_DEMAND &&
        (appointmentOrder || !appointmentAdminInfo?.isInterpreterFound)
      ) {
        await this.handleMeetingCancellation(meetingConfig);
      } else if (
        schedulingType === EAppointmentSchedulingType.PRE_BOOKED &&
        meetingConfig.isInterpreterWasOnlineInBooking === false &&
        meetingConfig.isClientWasOnlineInBooking === true
      ) {
        await this.handleMeetingCancellation(meetingConfig);
      } else {
        await this.handleMeetingClosure(meetingConfig);
      }

      return { message: "Meeting closed successfully" };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to close meeting id: ${chimeMeetingId}, message: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Unable to close the meeting");
    }
  }

  private async handleMeetingCancellation(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    const { appointment } = meetingConfig;

    await this.helperService.updateAppointmentStatus(appointment.id, EAppointmentStatus.CANCELLED_ORDER);

    if (appointment.appointmentAdminInfo?.isRedFlagEnabled) {
      await this.helperService.disableRedFlag(appointment);
    }

    await this.deleteMeetingRelatedResources(meetingConfig);

    if (appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      await this.appointmentOrderSharedLogicService.cancelOnDemandCalls(appointment.appointmentOrder);
    }

    this.generalPaymentsService.cancelPayInAuth(meetingConfig.appointment).catch((error: Error) => {
      this.lokiLogger.error(`Cancel appointment. Cancel payin error: ${error.message} `, error.stack);
    });
  }

  private async handleMeetingClosure(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    if (
      !meetingConfig.mediaRegion ||
      !meetingConfig.mediaPipelineId ||
      !meetingConfig.appointment.appointmentAdminInfo
    ) {
      this.lokiLogger.error(
        `Meeting-config Id:${meetingConfig.id} not contains full information for closing, meetingConfig: ${JSON.stringify(meetingConfig)}`,
      );
      throw new BadRequestException("Meeting has contains not full information for closing");
    }

    const recordingCallDirectory = await this.launchMediaConcatenationPipeline(
      meetingConfig.appointment.id,
      meetingConfig.mediaRegion,
      meetingConfig.mediaPipelineId,
    );

    await this.appointmentCommandService.finalizeVirtualAppointmentAndSaveRecording(
      meetingConfig.appointment,
      recordingCallDirectory,
    );

    if (
      meetingConfig.appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND &&
      meetingConfig.appointment.interpreterId
    ) {
      await this.helperService.makeOnlineInterpreterAfterOnDemand(meetingConfig.appointment.interpreterId);
    }

    await this.deleteMeetingRelatedResources(meetingConfig);

    this.generalPaymentsService.makePayInCaptureAndPayOut(meetingConfig.appointment.id).catch((error: Error) => {
      this.lokiLogger.error(`Make payin capture and payout error: ${error.message} `, error.stack);
    });
  }

  private async deleteMeetingRelatedResources(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    if (meetingConfig.appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      if (meetingConfig.appointment.appointmentOrder) {
        await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(
          meetingConfig.appointment.appointmentOrder,
        );
      }
    }

    await this.deleteAwsChimeMeeting(meetingConfig);
    await this.deleteMeetingConfigAndReminder(meetingConfig);
    await this.discountsService.processDiscountAssociationIfExists(meetingConfig.appointmentId);
  }

  private async launchMediaConcatenationPipeline(
    appointmentId: string,
    mediaRegion: string,
    mediaPipelineId: string,
  ): Promise<string> {
    const recordingCallDirectory = await this.chimeSdkService.createMediaConcatenationPipeline(
      appointmentId,
      mediaRegion,
      mediaPipelineId,
    );

    return recordingCallDirectory;
  }

  public async deleteMeetingConfigAndReminder(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    await this.helperService.deleteChimeMeetingWithAttendees(meetingConfig);
    await this.helperService.deleteAppointmentReminder(meetingConfig.appointment.appointmentReminder);
  }

  public async deleteAwsChimeMeeting(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    if (!meetingConfig.chimeMeetingId) {
      this.lokiLogger.error(`Chime meeting id not found for delete, meetingConfig: ${JSON.stringify(meetingConfig)}`);

      return;
    }

    await this.chimeSdkService.deleteMeeting(meetingConfig.chimeMeetingId);
  }
}
