import { EUserRoleName } from "src/modules/roles/common/enums";

export interface ITokenUserData {
  id: string;
  email: string;
  role: EUserRoleName;
  userRoleId: string;
  clientUserAgent: string;
  clientIPAddress: string;
}
