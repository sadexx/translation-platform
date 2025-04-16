import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  AdminUpdateAttendeeCapabilitiesDto,
  AppointmentIdParamDto,
  BaseGetChimeMeetingParamDto,
  UpdateAttendeeCapabilitiesDto,
  CreateCallAsReceptionistOrClientDto,
  CreateCallExternalParticipantsDto,
  ChimeMediaRegionQueryDto,
  GetChimeMeetingExternalUserDto,
  GetChimeMeetingParamDto,
  UpdateAttendeeStatusParamDto,
} from "src/modules/chime-meeting-configuration/common/dto";
import {
  AttendeeManagementService,
  MeetingClosingService,
  MeetingJoinService,
  SipMediaService,
} from "src/modules/chime-meeting-configuration/services";
import { CurrentUser } from "src/common/decorators";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { IAttendeeDetails, IJoinMeeting } from "src/modules/chime-meeting-configuration/common/interfaces";
import { UUIDParamDto } from "src/common/dto";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("chime/meetings")
export class ChimeMeetingConfigurationController {
  constructor(
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly meetingJoinService: MeetingJoinService,
    private readonly sipMediaService: SipMediaService,
    private readonly meetingClosingService: MeetingClosingService,
  ) {}

  @Get("/info-config/:appointmentId")
  @UseGuards(JwtFullAccessGuard)
  async getConfigAndAttendeesByAppointmentId(
    @Param() { appointmentId }: AppointmentIdParamDto,
  ): Promise<ChimeMeetingConfiguration & { attendees: Attendee[] }> {
    return await this.attendeeManagementService.getConfigAndAttendeesByAppointmentId(appointmentId);
  }

  @Get("/join-admin/:appointmentId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async joinMeetingAsSuperAdmin(
    @Param() { appointmentId }: AppointmentIdParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IJoinMeeting> {
    return await this.meetingJoinService.joinMeetingAsSuperAdmin(appointmentId, user);
  }

  @Get("/join/:appointmentId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async joinMeetingAsInternalUser(
    @Param() { appointmentId }: AppointmentIdParamDto,
    @Query() { mediaRegion }: ChimeMediaRegionQueryDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IJoinMeeting> {
    return await this.meetingJoinService.joinMeetingAsInternalUser(appointmentId, user, mediaRegion);
  }

  @Get("/join-external/:id")
  async joinMeetingAsExternalUser(
    @Param() { id }: UUIDParamDto,
    @Query() { externalUserId, mediaRegion }: GetChimeMeetingExternalUserDto,
  ): Promise<IJoinMeeting> {
    return await this.meetingJoinService.joinMeetingAsExternalUser(id, externalUserId, mediaRegion);
  }

  @Get(":chimeMeetingId/attendees/:attendeeId")
  async getAttendeeAndDetails(
    @Param() { chimeMeetingId, attendeeId }: GetChimeMeetingParamDto,
  ): Promise<IAttendeeDetails> {
    return await this.attendeeManagementService.getAttendeeAndDetails(chimeMeetingId, attendeeId);
  }

  @Patch("batch-update-attendees-capabilities/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async batchUpdateAttendeesCapabilities(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: AdminUpdateAttendeeCapabilitiesDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.attendeeManagementService.batchUpdateAttendeeCapabilities(chimeMeetingId, dto, user);
  }

  @Patch("update-attendee-capabilities/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateAttendeeCapabilities(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: UpdateAttendeeCapabilitiesDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.attendeeManagementService.updateAttendeeCapabilities(chimeMeetingId, dto, user);
  }

  @Delete(":chimeMeetingId/attendees/:attendeeId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async disableAttendeeInMeeting(
    @Param() { chimeMeetingId, attendeeId }: GetChimeMeetingParamDto,
  ): Promise<MessageOutput> {
    return await this.attendeeManagementService.disableAttendeeInMeeting(chimeMeetingId, attendeeId);
  }

  @Post("add-extra-attendee/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async addExtraAttendee(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<{
    joinUrl: string;
  }> {
    return await this.attendeeManagementService.addExtraAttendeeInLiveMeeting(chimeMeetingId, user);
  }

  @Post("receptionist-call/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async receptionistCall(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: CreateCallAsReceptionistOrClientDto,
  ): Promise<MessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallAsReceptionist(chimeMeetingId, dto);
  }

  @Post(":chimeMeetingId/direct-call-to-participants/:attendeeId")
  @UseGuards(JwtFullAccessGuard)
  async directCallToParticipant(
    @Param() { chimeMeetingId, attendeeId }: GetChimeMeetingParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationDirectCallToParticipant(
      chimeMeetingId,
      attendeeId,
      user,
    );
  }

  @Post("background-call-to-client/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async backgroundCallToClient(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallToClient(chimeMeetingId, user);
  }

  @Post("background-call-to-interpreter/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async backgroundCallToInterpreter(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallToInterpreter(chimeMeetingId, user);
  }

  @Post("background-call-for-external-participants/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async backgroundCallForExternalParticipants(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: CreateCallExternalParticipantsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallForParticipants(chimeMeetingId, dto, user);
  }

  @Post("clients-call-for-any-external-participants/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async clientsCallForAnyExternalParticipants(
    @Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto,
    @Body() dto: CreateCallAsReceptionistOrClientDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.sipMediaService.createSipMediaApplicationCallAsClient(chimeMeetingId, dto, user);
  }

  @Post("leave/:id/:attendeeId")
  async leaveMeeting(@Param() { id, attendeeId }: UpdateAttendeeStatusParamDto): Promise<MessageOutput> {
    return await this.meetingClosingService.leaveMeeting(id, attendeeId);
  }

  @Post("close/:chimeMeetingId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async closeMeeting(@Param() { chimeMeetingId }: BaseGetChimeMeetingParamDto): Promise<MessageOutput> {
    return await this.meetingClosingService.closeMeeting(chimeMeetingId);
  }
}
