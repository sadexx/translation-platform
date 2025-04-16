import { Appointment } from "src/modules/appointments/entities";

export interface ICreateAppointmentAdminInfo {
  appointment: Appointment;
  completedMeetingDuration: number;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  clientDateOfBirth: string;
  isRedFlagEnabled: boolean;
}
