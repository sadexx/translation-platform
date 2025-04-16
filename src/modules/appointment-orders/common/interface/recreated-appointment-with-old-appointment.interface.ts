import { Appointment } from "src/modules/appointments/entities";

export interface IRecreatedAppointmentWithOldAppointment {
  oldAppointment: Appointment;
  recreatedAppointment: Appointment;
}
