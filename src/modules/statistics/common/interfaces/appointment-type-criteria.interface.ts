import { EAppointmentCommunicationType, EAppointmentSchedulingType } from "src/modules/appointments/common/enums";

export interface IAppointmentTypeCriteria {
  communicationType?: EAppointmentCommunicationType;
  schedulingType?: EAppointmentSchedulingType;
}
