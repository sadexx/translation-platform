import { EUserRoleName } from "src/modules/roles/common/enums";
import { EUserGender } from "src/modules/users/common/enums";

export interface IInvitedInternalUser {
  id: string;
  user: { platformId: string };
  role: { name: EUserRoleName };
  profile: { firstName: string; lastName: string; gender: EUserGender };
}
