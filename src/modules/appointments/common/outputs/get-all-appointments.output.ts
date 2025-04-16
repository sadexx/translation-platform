import { PaginationOutput } from "src/common/outputs";
import { AppointmentOutput } from "src/modules/appointments/common/outputs";

export class GetAllAppointmentsOutput extends PaginationOutput {
  data: AppointmentOutput[];
}
