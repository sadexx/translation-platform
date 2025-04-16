import { EUserGender } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { EAccountStatus } from "src/modules/users-roles/common/enums";

export interface IUsersCsv {
  fullName: string | null;
  accountStatus: EAccountStatus;
  role: EUserRoleName;
  phoneNumber: string;
  email: string;
  gender: EUserGender | null;
  knownLanguages?: ELanguages[] | null;
  country: string | null;
  state: string | null;
  city: string | null;
}
