import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AwsChimeSdkService } from "src/modules/aws-chime-sdk/aws-chime-sdk.service";
import { UserRole } from "src/modules/users-roles/entities";
import { Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import {
  CreateCallAsReceptionistOrClientDto,
  CreateCallExternalParticipantsDto,
} from "src/modules/chime-meeting-configuration/common/dto";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { MessageOutput } from "src/common/outputs";
import { findOneOrFail } from "src/common/utils";
import { AttendeeManagementService, ChimeMeetingQueryService } from "src/modules/chime-meeting-configuration/services";
import { LFH_ADMIN_ROLES } from "src/common/constants";

@Injectable()
export class SipMediaService {
  private readonly lokiLogger = new LokiLogger(SipMediaService.name);
  private readonly TEMPORARY_PHONE_NUMBER: string = "+14582464706";
  private readonly MAX_PSTN_CALLS_FOR_CLIENT: number = 3;

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryService,
    private readonly attendeeManagementService: AttendeeManagementService,
  ) {}

  public async createSipMediaApplicationCallAsReceptionist(
    chimeMeetingId: string,
    dto: CreateCallAsReceptionistOrClientDto,
  ): Promise<MessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigByChimeMeetingIdOptions(chimeMeetingId);
    const meetingConfig = await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException("Meeting is not started");
    }

    const attendee = await this.attendeeManagementService.addPstnParticipantToLiveMeeting(
      meetingConfig,
      dto.toPhoneNumber,
    );
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      dto.toPhoneNumber,
      meetingConfig.chimeMeetingId,
      attendee.attendeeId,
    );

    return { message: "Successfully created call" };
  }

  public async createSipMediaApplicationDirectCallToParticipant(
    chimeMeetingId: string,
    attendeeId: string,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    const meetingConfig = await this.getMeetingConfigForDirectCall(chimeMeetingId, attendeeId, user);

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException("Meeting is not started");
    }

    const toPhoneNumber = await this.getAttendeePhoneNumber(meetingConfig.attendees, attendeeId);
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      toPhoneNumber,
      chimeMeetingId,
      attendeeId,
    );

    return { message: "Successfully created call" };
  }

  public async createSipMediaApplicationCallToClient(
    chimeMeetingId: string,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigByClientOptions(chimeMeetingId, user.userRoleId);
    const meetingConfig = await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);

    if (!meetingConfig.appointment.client || !meetingConfig.appointment.client.user.phoneNumber) {
      throw new BadRequestException("Client information not found for call");
    }

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException("Meeting is not started");
    }

    const attendeeId = meetingConfig.appointment.client.id;
    const clientPhoneNumber = meetingConfig.appointment.client.user.phoneNumber;

    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      clientPhoneNumber,
      chimeMeetingId,
      attendeeId,
    );

    return { message: "Successfully created call" };
  }

  public async createSipMediaApplicationCallToInterpreter(
    chimeMeetingId: string,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigByInterpreterOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);

    if (!meetingConfig.appointment.interpreter || !meetingConfig.appointment.interpreter.user.phoneNumber) {
      throw new BadRequestException("Interpreter information not found for call");
    }

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException("Meeting is not started");
    }

    const attendeeId = meetingConfig.appointment.interpreter.id;
    const interpreterPhoneNumber = meetingConfig.appointment.interpreter.user.phoneNumber;

    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      interpreterPhoneNumber,
      chimeMeetingId,
      attendeeId,
    );

    return { message: "Successfully created call" };
  }

  public async createSipMediaApplicationCallForParticipants(
    chimeMeetingId: string,
    dto: CreateCallExternalParticipantsDto,
    user: ITokenUserData,
  ): Promise<MessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigForParticipantsOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException("Meeting is not started");
    }

    const inActiveAttendeeIds = new Set(dto.inActiveAttendeeIds);
    const attendeesToCall = meetingConfig.attendees.filter(
      (attendee) => attendee.guestPhoneNumber && inActiveAttendeeIds.has(attendee.attendeeId),
    );

    if (attendeesToCall.length === 0) {
      return { message: "No attendees to call" };
    }

    await this.createMultipleSipCalls(chimeMeetingId, attendeesToCall);

    return { message: "Successfully created calls" };
  }

  public async createSipMediaApplicationCallAsClient(
    chimeMeetingId: string,
    dto: CreateCallAsReceptionistOrClientDto,
    user: ITokenUserData,
  ): Promise<{ message: string }> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigForClientPstnCallsOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFail(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
      "chimeMeetingId",
    );

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException("Meeting is not started");
    }

    if (meetingConfig.clientPstnCallCount >= this.MAX_PSTN_CALLS_FOR_CLIENT) {
      this.lokiLogger.error(`Meeting ${meetingConfig.id} PSTN calls limit exceeded`);
      throw new BadRequestException("You have reached the maximum number of PSTN calls");
    }

    const attendee = await this.attendeeManagementService.addPstnParticipantToLiveMeeting(
      meetingConfig,
      dto.toPhoneNumber,
    );
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      dto.toPhoneNumber,
      meetingConfig.chimeMeetingId,
      attendee.attendeeId,
    );

    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      clientPstnCallCount: meetingConfig.clientPstnCallCount + 1,
    });

    return { message: "Successfully created calls" };
  }

  private async getMeetingConfigForDirectCall(
    chimeMeetingId: string,
    attendeeId: string,
    user: ITokenUserData,
  ): Promise<ChimeMeetingConfiguration> {
    if (LFH_ADMIN_ROLES.includes(user.role)) {
      const queryOptions = this.chimeMeetingQueryService.getMeetingConfigWithAttendeesForAdminOptions(
        chimeMeetingId,
        attendeeId,
      );

      return await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);
    }

    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigWithAttendeesForOthersOptions(
      chimeMeetingId,
      user.userRoleId,
    );

    return await findOneOrFail(chimeMeetingId, this.chimeMeetingConfigurationRepository, queryOptions);
  }

  private async getAttendeePhoneNumber(attendees: Attendee[], attendeeId: string): Promise<string> {
    const attendee = attendees.find((a) => a.attendeeId === attendeeId);

    if (!attendee) {
      throw new NotFoundException("Attendee in the meeting not found");
    }

    if (attendee.roleName === EUserRoleName.INVITED_GUEST) {
      if (!attendee.guestPhoneNumber) {
        throw new NotFoundException("Attendee phone number not found for guest");
      }

      return attendee.guestPhoneNumber;
    }

    const queryOptions = this.chimeMeetingQueryService.getInternalUserByExternalUserIdOptions(attendee.externalUserId);
    const internalUser = await findOneOrFail(attendee.externalUserId, this.userRoleRepository, queryOptions);

    if (!internalUser.user.phoneNumber) {
      throw new NotFoundException("Attendee phone number not found for internal user");
    }

    return internalUser.user.phoneNumber;
  }

  private async createMultipleSipCalls(chimeMeetingId: string, attendees: Attendee[]): Promise<void> {
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;

    for (const attendee of attendees) {
      if (!attendee.guestPhoneNumber) {
        this.lokiLogger.error(`Skipping attendee without phone number: ${JSON.stringify(attendee)}`);
        continue;
      }

      await this.chimeSdkService.createSipMediaApplicationCall(
        fromPhoneNumber,
        attendee.guestPhoneNumber,
        chimeMeetingId,
        attendee.attendeeId,
      );
    }
  }
}
