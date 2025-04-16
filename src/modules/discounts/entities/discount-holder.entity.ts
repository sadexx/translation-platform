import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Company } from "src/modules/companies/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";

@Entity({ name: "discount_holders" })
export class DiscountHolder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.discountHolder, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_users_roles_FK",
  })
  userRole?: UserRole | null;

  @OneToOne(() => Company, (company) => company.discountHolder, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_companies_FK",
  })
  company?: Company | null;

  @ManyToOne(() => PromoCampaign, (promoCampaign) => promoCampaign.discountHolders, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "promo_campaign_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_promo_campaigns_FK",
  })
  promoCampaign?: PromoCampaign | null;

  @OneToOne(() => MembershipAssignment, (membershipAssignment) => membershipAssignment.discountHolder, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "membership_assignment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_holders_membership_assignments_FK",
  })
  membershipAssignment?: MembershipAssignment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
