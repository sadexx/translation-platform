import { Address } from "src/modules/addresses/entities";
import { AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { Appointment } from "src/modules/appointments/entities";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { ERepeatInterval } from "src/modules/appointment-orders/common/enum";
import { EUserGender } from "src/modules/users/common/enums";

export interface ICreateAppointmentOrder {
  appointment: Appointment;
  platformId: string;
  appointmentOrderGroup?: AppointmentOrderGroup;
  isOrderGroup?: boolean;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  communicationType: EAppointmentCommunicationType;
  schedulingType: EAppointmentSchedulingType;
  schedulingDurationMin: number;
  topic: EAppointmentTopic;
  preferredInterpreterGender: EUserGender | null;
  interpreterType: EAppointmentInterpreterType;
  interpretingType: EAppointmentInterpretingType;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  clientPlatformId: string;
  clientFirstName: string;
  clientLastName: string;
  participantType: EAppointmentParticipantType;
  nextRepeatTime: Date | null;
  repeatInterval: ERepeatInterval | null;
  remainingRepeats: number | null;
  notifyAdmin: Date | null;
  endSearchTime: Date | null;
  operatedByCompanyName: string;
  operatedByCompanyId: string;
  timeToRestart: null;
  isFirstSearchCompleted: boolean | null;
  isSecondSearchCompleted: boolean | null;
  isSearchNeeded: boolean | null;
  isCompanyHasInterpreters: boolean | null;
  approximateCost: number;
  acceptOvertimeRates: boolean | null;
  timezone: string | null;
  address?: Address | null;
}
