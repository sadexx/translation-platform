import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IEmployeesCsv {
  fullName: string;
  accountStatus: EAccountStatus;
  role: EUserRoleName;
  phoneNumber: string;
  email: string;
  city: string;
}
