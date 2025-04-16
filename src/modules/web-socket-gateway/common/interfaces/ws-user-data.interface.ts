import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IWebSocketUserData {
  id: string;
  userRoleId: string;
  role: EUserRoleName;
  clientUserAgent: string;
  clientIPAddress: string;
}
