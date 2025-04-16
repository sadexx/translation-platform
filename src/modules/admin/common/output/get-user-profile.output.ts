import { UserRole } from "src/modules/users-roles/entities";

export class GetUserProfileOutput {
  profile: Partial<UserRole>;
}
