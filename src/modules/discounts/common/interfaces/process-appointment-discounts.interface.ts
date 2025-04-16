import { Appointment } from "src/modules/appointments/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";

export interface IProcessAppointmentDiscounts {
  appointment: Appointment;
  membershipAssignment: MembershipAssignment;
}
