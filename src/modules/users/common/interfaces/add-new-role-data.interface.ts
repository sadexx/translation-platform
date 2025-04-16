import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IAddNewRoleData {
  userId: string;
  role: EUserRoleName;
}
