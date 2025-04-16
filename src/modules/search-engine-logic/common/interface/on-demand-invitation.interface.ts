import { EAppointmentCommunicationType, EAppointmentTopic } from "src/modules/appointments/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";

export interface IOnDemandInvitation {
  invitationLink: string;
  appointmentOrderId: string;
  appointmentId: string;
  clientName: string;
  clientPlatformId: string;
  clientCompanyName: string;
  schedulingDurationMin: number;
  communicationType: EAppointmentCommunicationType;
  topic: EAppointmentTopic;
  languageFrom: ELanguages;
  languageTo: ELanguages;
}
