import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IStartRegistrationSessionData {
  email: string;
  userRole?: EUserRoleName;
  userId?: string;
  isOauth?: boolean;
  isAdditionalRole?: boolean;
  isInvitation?: boolean;
  clientIPAddress?: string;
  clientUserAgent?: string;
}
