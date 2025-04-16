import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { EExtMediaCapabilities } from "src/modules/chime-meeting-configuration/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";

export interface ICreateAttendee {
  chimeMeetingConfiguration: ChimeMeetingConfiguration;
  externalUserId: string;
  roleName: EUserRoleName;
  attendeeId?: string;
  isOnline: boolean;
  isAnonymousGuest: boolean;
  joinUrl: string;
  guestPhoneNumber: string | null;
  joinToken?: string;
  audioCapabilities: EExtMediaCapabilities;
  videoCapabilities: EExtMediaCapabilities;
  contentCapabilities: EExtMediaCapabilities;
}
