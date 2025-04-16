import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EMembershipAssignmentStatus } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";
import { DiscountAssociation, DiscountHolder } from "src/modules/discounts/entities";
import { UserRole } from "src/modules/users-roles/entities";

@Entity({ name: "membership_assignments" })
export class MembershipAssignment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.membershipAssignment, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "membership_assignments_users_roles_FK",
  })
  userRole: UserRole;

  @Column({
    type: "enum",
    enum: EMembershipAssignmentStatus,
    name: "status",
  })
  status: EMembershipAssignmentStatus;

  @Column({ type: "integer", name: "discount" })
  discount: number;

  @Column({ type: "integer", name: "on_demand_minutes" })
  onDemandMinutes: number;

  @Column({ type: "integer", name: "pre_booked_minutes" })
  preBookedMinutes: number;

  @Column({ type: "timestamptz", name: "start_date", nullable: true })
  startDate: Date;

  @Column({ type: "timestamptz", name: "end_date", nullable: true })
  endDate: Date;

  @Index("membership_assignments_current_membership_id_IDX")
  @ManyToOne(() => Membership, (membership) => membership.currentMemberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "current_membership_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "current_membership_assignments_memberships_FK",
  })
  currentMembership: Membership;

  @Index("membership_assignments_next_membership_id_IDX")
  @ManyToOne(() => Membership, (membership) => membership.nextMemberships, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({
    name: "next_membership_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "next_membership_assignments_memberships_FK",
  })
  nextMembership: Membership | null;

  @OneToMany(() => DiscountAssociation, (discountAssociation) => discountAssociation.membershipAssignment, {
    nullable: true,
  })
  discountAssociations?: DiscountAssociation[] | null;

  @OneToOne(() => DiscountHolder, (discountHolder) => discountHolder.membershipAssignment)
  discountHolder: DiscountHolder;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
