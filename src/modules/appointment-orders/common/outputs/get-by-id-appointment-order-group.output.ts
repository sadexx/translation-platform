import { Expose } from "class-transformer";
import { AppointmentOrderGroupOutput } from "src/modules/appointment-orders/common/outputs";

export class AppointmentOrderGroupByIdOutout extends AppointmentOrderGroupOutput {
  @Expose()
  isRejected: boolean;
}
