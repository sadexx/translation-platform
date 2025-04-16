import { EMembershipAssignmentStatus } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";
import { UserRole } from "src/modules/users-roles/entities";

export interface ICreateMembershipAssignment {
  userRole: UserRole;
  status: EMembershipAssignmentStatus;
  discount: number;
  onDemandMinutes: number;
  preBookedMinutes: number;
  startDate?: Date;
  endDate?: Date;
  currentMembership: Membership;
  nextMembership: Membership;
}
