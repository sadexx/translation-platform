import { Appointment } from "src/modules/appointments/entities";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { EMembershipType } from "src/modules/memberships/common/enums";

export interface ICreateDiscountAssociation {
  appointment: Appointment;
  promoCampaignDiscount: number | null;
  membershipDiscount: number | null;
  promoCampaignDiscountMinutes: number | null;
  membershipFreeMinutes: number | null;
  promoCode: string | null;
  membershipType: EMembershipType | null;
  promoCampaign: PromoCampaign | null;
  membershipAssignment: MembershipAssignment | null;
}
