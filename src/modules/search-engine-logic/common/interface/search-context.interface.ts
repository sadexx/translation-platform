import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { SelectQueryBuilder } from "typeorm";
import { EAppointmentSchedulingType } from "src/modules/appointments/common/enums";

export interface ISearchContextBase {
  query: SelectQueryBuilder<InterpreterProfile>;
  order: AppointmentOrder;
  orderType: EAppointmentSchedulingType;
  sendNotifications: boolean;
  setRedFlags: boolean;
  isFirstSearchCompleted: boolean;
  isSecondSearchCompleted: boolean;
  isSearchNeeded: boolean;
  isCompanyHasInterpreters: boolean;
  timeToRestart: Date | null;
  isOrderSaved: boolean;
}

export interface IGroupSearchContext extends ISearchContextBase {
  group: AppointmentOrderGroup;
}
