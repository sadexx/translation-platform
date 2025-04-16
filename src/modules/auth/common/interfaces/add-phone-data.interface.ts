import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IAddPhoneData {
  phoneNumber: string;
  role: EUserRoleName;
  email: string;
}
