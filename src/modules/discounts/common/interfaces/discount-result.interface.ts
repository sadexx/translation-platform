import { MembershipAssignment } from "src/modules/memberships/entities";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";

export interface IDiscountResult {
  promoCampaignDiscount: number | null;
  membershipDiscount: number | null;
  promoCampaignDiscountMinutes: number | null;
  membershipFreeMinutes: number | null;
  promoCampaign: PromoCampaign | null;
  membershipAssignment: MembershipAssignment | null;
}
