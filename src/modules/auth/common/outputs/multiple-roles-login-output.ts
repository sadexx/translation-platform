import { EUserRoleName } from "src/modules/roles/common/enums";

export class MultipleRolesLoginOutput {
  availableRoles: EUserRoleName[];
  roleSelectionToken: string;
}
