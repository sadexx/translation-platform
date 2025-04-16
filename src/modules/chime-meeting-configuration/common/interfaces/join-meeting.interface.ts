import { IMeeting, IMeetingAttendee } from "src/modules/chime-meeting-configuration/common/interfaces";

export interface IJoinMeeting {
  Meeting: IMeeting;
  Attendee: IMeetingAttendee;
}
