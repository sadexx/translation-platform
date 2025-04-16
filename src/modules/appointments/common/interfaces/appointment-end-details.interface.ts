import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IAppointmentEndDetails {
  clientAlternativeScheduledStartTime?: Date | null;
  clientAlternativeScheduledEndTime?: Date | null;
  interpreterAlternativeScheduledStartTime?: Date | null;
  interpreterAlternativeScheduledEndTime?: Date | null;
  adminAlternativeScheduledStartTime?: Date | null;
  adminAlternativeScheduledEndTime?: Date | null;
  clientSignature?: string | null;
  interpreterSignature?: string | null;
  adminSignature?: string | null;
  clientTimeUpdated?: boolean;
  interpreterTimeUpdated?: boolean;
  isClientTimeLatest?: boolean;
  adminRoleName?: EUserRoleName | null;
  adminFirstName?: string | null;
  adminPlatformId?: string | null;
}
