import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";

export interface IUserWithRoleIdAndCountry extends Omit<User, "setPlatformId"> {
  userRoleId: string;
  country: string | null;
  userRoleCreationDate: Date;
  userRoleOperatedById: string;
  userRoleOperatedByName: string;
  userRoleIsActive: boolean;
  currentUserRole: UserRole;
}
