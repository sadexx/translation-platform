import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";

export interface IAllTypeAppointmentOrdersForWebsocket {
  appointmentOrders: AppointmentOrder[];
  appointmentOrdersGroups: AppointmentOrderGroup[];
}
