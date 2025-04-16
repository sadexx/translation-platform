import { EUserRoleName } from "src/modules/roles/common/enums";

export interface ICreateTokensData {
  userId: string;
  userRoleId: string;
  userRole: EUserRoleName;
  clientIPAddress: string;
  clientUserAgent: string;
}
