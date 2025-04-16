import { Company } from "src/modules/companies/entities";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";

export interface ICreateDiscountHolder {
  userRole: UserRole | null;
  company: Company | null;
  promoCampaign?: PromoCampaign;
  membershipAssignment?: MembershipAssignment;
}
