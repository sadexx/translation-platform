import { Expose } from "class-transformer";
import { AppointmentOrderOutput } from "src/modules/appointment-orders/common/outputs";

export class AppointmentOrderByIdOutput extends AppointmentOrderOutput {
  @Expose()
  isRejected: boolean;
}
