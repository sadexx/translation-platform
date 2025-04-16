import { EUserRoleName } from "src/modules/roles/common/enums";
import { AppointmentAdminInfo } from "src/modules/appointments/entities";

export interface ICreateAppointmentCancellationInfo {
  appointmentAdminInfo: AppointmentAdminInfo;
  cancelledById: string;
  cancelledByPlatformId: string;
  cancelledByFirstName: string;
  roleName: EUserRoleName;
  cancellationReason?: string | null;
}
