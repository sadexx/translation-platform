import { Appointment } from "src/modules/appointments/entities";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";

export interface IErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  conflictingAppointments?: Appointment[];
  uncompletedAppointmentStatuses?: EAppointmentStatus[];
  isPromoAssigned?: boolean;
}
