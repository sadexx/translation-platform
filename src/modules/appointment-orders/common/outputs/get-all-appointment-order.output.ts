import { Expose, Type } from "class-transformer";
import { AppointmentOrderGroupOutput, AppointmentOrderOutput } from "src/modules/appointment-orders/common/outputs";

export class AllTypeAppointmentOrdersOutput {
  @Expose()
  @Type(() => AppointmentOrderOutput)
  appointmentOrders: AppointmentOrderOutput[];

  @Expose()
  @Type(() => AppointmentOrderGroupOutput)
  appointmentOrdersGroups: AppointmentOrderGroupOutput[];
}
