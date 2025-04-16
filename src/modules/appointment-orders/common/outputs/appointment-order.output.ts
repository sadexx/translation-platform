import { Exclude, Expose, Type } from "class-transformer";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { MultiWayParticipantOutput } from "src/modules/multi-way-participant/common/outputs";
import { ERepeatInterval } from "src/modules/appointment-orders/common/enum";
import { EUserGender } from "src/modules/users/common/enums";

class AppointmentWithParticipantsOutput {
  @Expose()
  id: string;

  @Expose()
  @Type(() => MultiWayParticipantOutput)
  participants: MultiWayParticipantOutput[];
}

export class AppointmentOrderOutput {
  @Expose()
  id: string;

  @Expose()
  isOrderGroup: boolean;

  @Exclude()
  matchedInterpreterIds: string[];

  @Exclude()
  rejectedInterpreterIds: string[];

  @Expose()
  scheduledStartTime: Date;

  @Expose()
  scheduledEndTime: Date;

  @Expose()
  communicationType: EAppointmentCommunicationType;

  @Expose()
  schedulingType: EAppointmentSchedulingType;

  @Expose()
  schedulingDurationMin: number;

  @Expose()
  topic: EAppointmentTopic;

  @Exclude()
  preferredInterpreterGender: EUserGender;

  @Expose()
  interpreterType: EAppointmentInterpreterType;

  @Expose()
  interpretingType: EAppointmentInterpretingType;

  @Expose()
  languageFrom: ELanguages;

  @Expose()
  languageTo: ELanguages;

  @Expose()
  approximateCost: number;

  @Expose()
  clientPlatformId: string;

  @Expose()
  clientFirstName: string;

  @Expose()
  clientLastName: string;

  @Exclude()
  nextRepeatTime: Date | null;

  @Exclude()
  repeatInterval: ERepeatInterval | null;

  @Exclude()
  remainingRepeats: number | null;

  @Exclude()
  notifyAdmin: Date | null;

  @Exclude()
  endSearchTime: Date | null;

  @Expose()
  operatedByCompanyName: string;

  @Exclude()
  operatedByCompanyId: string;

  @Exclude()
  timeToRestart: Date | null;

  @Exclude()
  isFirstSearchCompleted: boolean | null;

  @Exclude()
  isSecondSearchCompleted: boolean | null;

  @Exclude()
  isSearchNeeded: boolean | null;

  @Exclude()
  isCompanyHasInterpreters: boolean | null;

  @Exclude()
  acceptOvertimeRates: boolean | null;

  @Exclude()
  timezone: string | null;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;

  @Expose()
  @Type(() => AppointmentWithParticipantsOutput)
  appointment: AppointmentWithParticipantsOutput;
}
