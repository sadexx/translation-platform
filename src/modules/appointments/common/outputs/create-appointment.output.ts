import { EAppointmentCommunicationType } from "src/modules/appointments/common/enums";

export interface ICreateAppointmentOutput {
  message: string;
  id?: string;
  communicationType?: EAppointmentCommunicationType;
}
