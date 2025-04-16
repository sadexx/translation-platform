import { Appointment } from "src/modules/appointments/entities";

export interface ILiveAppointmentCacheData {
  appointment: Appointment;
  isEndingSoonPushSent: boolean;
  extensionPeriodStart?: Date;
}
