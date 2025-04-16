import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { UserRole } from "src/modules/users-roles/entities";
import { EUserGender } from "src/modules/users/common/enums";

export interface ICreateDraftAppointment {
  client: UserRole;
  scheduledStartTime: Date;
  communicationType: EAppointmentCommunicationType;
  schedulingType: EAppointmentSchedulingType;
  schedulingDurationMin: number;
  topic: EAppointmentTopic;
  preferredInterpreterGender: EUserGender | null;
  interpreterType: EAppointmentInterpreterType;
  interpretingType: EAppointmentInterpretingType;
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType | null;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  participantType: EAppointmentParticipantType;
  alternativePlatform: boolean;
  alternativeVideoConferencingPlatformLink: string | null;
  notes: string | null;
  schedulingExtraDay: boolean;
  isGroupAppointment: boolean;
  sameInterpreter: boolean;
  operatedByCompanyName: string;
  operatedByCompanyId: string;
}
