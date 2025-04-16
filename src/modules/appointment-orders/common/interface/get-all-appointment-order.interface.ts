import { AppointmentOrderGroupOutput, AppointmentOrderOutput } from "src/modules/appointment-orders/common/outputs";

export interface IAllTypeAppointmentOrders {
  appointmentOrders: AppointmentOrderOutput[];
  appointmentOrdersGroups: AppointmentOrderGroupOutput[];
}
