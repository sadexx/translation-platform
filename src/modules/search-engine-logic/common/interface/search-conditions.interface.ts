import { EAppointmentTopic } from "src/modules/appointments/common/enums";

export interface ISearchConditions {
  appointmentId: string;
  topic?: EAppointmentTopic;
  preferredInterpreterGender?: string;
}
