import {
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentCommunicationType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";

export interface IDraftAppointmentsCsv {
  platformId: string;
  status: string;
  interpreterType: EAppointmentInterpreterType;
  schedulingType: EAppointmentSchedulingType;
  communicationType: EAppointmentCommunicationType;
  scheduledStartTime: Date;
  schedulingDurationMin: number;
  clientFullName: string;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  topic: EAppointmentTopic;
  creationDate: Date;
}
