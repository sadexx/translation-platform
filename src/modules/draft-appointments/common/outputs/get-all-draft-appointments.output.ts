import { PaginationOutput } from "src/common/outputs";
import { DraftAppointmentOutput } from "src/modules/draft-appointments/common/outputs";

export class GetAllDraftAppointmentsOutput extends PaginationOutput {
  data: DraftAppointmentOutput[];
}
