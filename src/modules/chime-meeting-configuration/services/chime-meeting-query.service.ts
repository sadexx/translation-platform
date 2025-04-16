import { Injectable } from "@nestjs/common";
import { FindManyOptions, FindOneOptions } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";

@Injectable()
export class ChimeMeetingQueryService {
  /**
   ** MeetingCreationService
   */

  public async getAnonymousAttendeeCountOptions(chimeMeetingId: string): Promise<FindManyOptions<Attendee>> {
    return {
      where: {
        chimeMeetingConfiguration: { chimeMeetingId: chimeMeetingId },
        isAnonymousGuest: true,
      },
    };
  }

  public getChimeMeetingConfigurationOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          communicationType: true,
        },
      },
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId, status: EAppointmentStatus.LIVE },
      },
      relations: { appointment: true },
    };
  }

  public getChimeMeetingConfigUpdateOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: { appointmentId: appointmentId },
      relations: { attendees: true },
    };
  }

  /**
   ** AttendeeManagementService
   */

  public getMeetingConfigAndAttendeesOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: { appointmentId: appointmentId },
      relations: {
        attendees: true,
      },
    };
  }

  public getAttendeeOptions(meetingId: string, attendeeId: string): FindOneOptions<Attendee> {
    return {
      where: { attendeeId: attendeeId, chimeMeetingConfiguration: { chimeMeetingId: meetingId } },
    };
  }

  public getMultiWayParticipantOptions(externalUserId: string): FindOneOptions<MultiWayParticipant> {
    return {
      select: {
        id: true,
        name: true,
      },
      where: { id: externalUserId },
    };
  }

  public getUserRoleOptions(externalUserId: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
        role: {
          name: true,
        },
        profile: {
          firstName: true,
          lastName: true,
          gender: true,
        },
        user: {
          avatarUrl: true,
          platformId: true,
        },
      },
      where: { id: externalUserId },
      relations: {
        user: true,
        role: true,
        profile: true,
      },
    };
  }

  public getBatchUpdateAttendeeCapabilitiesOptions(
    chimeMeetingId: string,
    externalUserId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: { chimeMeetingId: chimeMeetingId, attendees: { externalUserId: externalUserId } },
      relations: { attendees: true },
      relationLoadStrategy: "query",
    };
  }

  public getUpdateAttendeeCapabilitiesOptions(
    chimeMeetingId: string,
    attendeeId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: { chimeMeetingId: chimeMeetingId, attendees: { attendeeId: attendeeId } },
      relations: { attendees: true },
    };
  }

  public getAttendeeByExternalUserIdOptions(meetingConfigId: string, externalUserId: string): FindOneOptions<Attendee> {
    return {
      where: {
        externalUserId: externalUserId,
        chimeMeetingConfigurationId: meetingConfigId,
      },
    };
  }

  /**
   ** MeetingJoinService
   */

  public getSuperAdminMeetingConfigOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          schedulingType: true,
          communicationType: true,
          appointmentAdminInfo: {
            id: true,
            isRedFlagEnabled: true,
          },
        },
      },
      where: { appointmentId: appointmentId },
      relations: { attendees: true, appointment: { appointmentOrder: true, appointmentAdminInfo: true } },
    };
  }

  public getOnDemandMeetingConfigOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          communicationType: true,
        },
      },
      where: { appointmentId: appointmentId },
      relations: { attendees: true, appointment: true },
    };
  }

  public getInternalUserMeetingConfigOptions(
    appointmentId: string,
    userRoleId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          status: true,
          schedulingType: true,
          appointmentAdminInfo: {
            id: true,
          },
        },
      },
      where: { appointmentId: appointmentId, attendees: { externalUserId: userRoleId } },
      relations: { attendees: true, appointment: { appointmentAdminInfo: true } },
      relationLoadStrategy: "query",
    };
  }

  public getExternalUserMeetingConfigOptions(
    id: string,
    externalUserId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          status: true,
        },
      },
      where: { id: id, attendees: { externalUserId: externalUserId } },
      relations: { attendees: true, appointment: true },
      relationLoadStrategy: "query",
    };
  }

  /**
   ** SipMediaService
   */

  public getMeetingConfigByChimeMeetingIdOptions(chimeMeetingId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          communicationType: true,
        },
      },
      where: { chimeMeetingId: chimeMeetingId },
      relations: { appointment: true },
    };
  }

  public getMeetingConfigWithAttendeesForAdminOptions(
    chimeMeetingId: string,
    attendeeId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: {
        chimeMeetingId: chimeMeetingId,
        attendees: { attendeeId: attendeeId },
      },
      relations: { attendees: true },
      relationLoadStrategy: "query",
    };
  }

  public getMeetingConfigWithAttendeesForOthersOptions(
    chimeMeetingId: string,
    externalUserId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: {
        chimeMeetingId: chimeMeetingId,
        attendees: { externalUserId: externalUserId },
      },
      relations: { attendees: true },
      relationLoadStrategy: "query",
    };
  }

  public getInternalUserByExternalUserIdOptions(externalUserId: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
        user: {
          platformId: true,
          phoneNumber: true,
        },
      },
      where: { id: externalUserId },
      relations: {
        user: true,
      },
    };
  }

  public getMeetingConfigByClientOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          client: {
            id: true,
            user: {
              phoneNumber: true,
            },
          },
        },
      },
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId },
        attendees: { externalUserId: clientId },
      },
      relations: {
        appointment: { client: { user: true } },
      },
    };
  }

  public getMeetingConfigByInterpreterOptions(
    chimeMeetingId: string,
    interpreterId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          interpreter: {
            id: true,
            user: {
              phoneNumber: true,
            },
          },
        },
      },
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { interpreterId: interpreterId },
        attendees: { externalUserId: interpreterId },
      },
      relations: {
        appointment: { interpreter: { user: true } },
      },
    };
  }

  public getMeetingConfigForParticipantsOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId },
        attendees: { roleName: EUserRoleName.INVITED_GUEST },
      },
      relations: {
        attendees: true,
      },
    };
  }

  public getMeetingConfigForClientPstnCallsOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        id: true,
        chimeMeetingId: true,
        meetingLaunchTime: true,
        clientPstnCallCount: true,
        appointment: {
          id: true,
          communicationType: true,
        },
      },
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId },
        attendees: { externalUserId: clientId },
      },
      relations: {
        appointment: true,
      },
    };
  }

  /**
   ** MeetingClosingService
   */

  public getChimeMeetingForClosingOptions(chimeMeetingId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          platformId: true,
          clientId: true,
          interpreterId: true,
          schedulingType: true,
          scheduledEndTime: true,
          businessEndTime: true,
          scheduledStartTime: true,
          interpreterType: true,
          communicationType: true,
          interpretingType: true,
          topic: true,
          schedulingDurationMin: true,
          appointmentsGroupId: true,
          channelId: true,
          status: true,
          creationDate: true,
          appointmentAdminInfo: {
            id: true,
            isInterpreterFound: true,
            isRedFlagEnabled: true,
          },
          appointmentReminder: {
            id: true,
          },
          appointmentOrder: {
            id: true,
            platformId: true,
            matchedInterpreterIds: true,
            appointment: {
              id: true,
            },
          },
          appointmentRating: {
            id: true,
          },
          interpreter: {
            id: true,
            interpreterProfile: {
              interpreterBadgePdf: true,
            },
          },
        },
      },
      where: { chimeMeetingId: chimeMeetingId },
      relations: {
        appointment: {
          appointmentReminder: true,
          appointmentAdminInfo: true,
          appointmentOrder: { appointment: true },
          appointmentRating: true,
          interpreter: {
            interpreterProfile: true,
          },
        },
        attendees: true,
      },
    };
  }
}
