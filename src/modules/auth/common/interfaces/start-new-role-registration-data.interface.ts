import { EUserRoleName } from "src/modules/roles/common/enums";
import { ICurrentUserData } from "src/modules/users/common/interfaces";

export interface IStartNewRoleRegistrationData {
  user: ICurrentUserData;
  role: EUserRoleName;
}
