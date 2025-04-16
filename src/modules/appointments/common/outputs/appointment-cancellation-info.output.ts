import { Expose } from "class-transformer";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class AppointmentCancellationInfoOutput {
  @Expose()
  id: string;

  @Expose()
  cancelledById: string;

  @Expose()
  roleName: EUserRoleName;

  @Expose()
  cancellationReason?: string | null;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
