import { Company } from "src/modules/companies/entities";
import { Session } from "src/modules/sessions/entities";
import { UserRole } from "src/modules/users-roles/entities";

export class CreateUserProfileOutput {
  id: string;
  email: string;
  isEmailVerified: boolean;
  phoneNumber: string;
  isTwoStepVerificationEnabled: boolean;
  password: string;
  sessions: Session[];
  administratedCompany?: Company;
  userRoles: UserRole[];
}
