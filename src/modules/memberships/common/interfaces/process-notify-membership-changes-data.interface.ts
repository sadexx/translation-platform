import { EMembershipNotificationType, EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";

export interface IProcessNotifyMembershipChanges {
  membership: Membership;
  membershipAssignment: MembershipAssignment;
  notificationType: EMembershipNotificationType;
  membershipPricingRegion?: EMembershipPricingRegion;
}
