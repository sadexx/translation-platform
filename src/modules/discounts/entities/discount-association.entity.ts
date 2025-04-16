import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { Appointment } from "src/modules/appointments/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { EMembershipType } from "src/modules/memberships/common/enums";

@Entity({ name: "discount_associations" })
export class DiscountAssociation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "integer", name: "promo_campaign_discount", nullable: true })
  promoCampaignDiscount: number | null;

  @Column({ type: "integer", name: "membership_discount", nullable: true })
  membershipDiscount: number | null;

  @Column({ type: "integer", name: "promo_campaign_discount_minutes", nullable: true })
  promoCampaignDiscountMinutes: number | null;

  @Column({ type: "integer", name: "membership_free_minutes", nullable: true })
  membershipFreeMinutes: number | null;

  @Column({ type: "varchar", name: "promo_code", nullable: true })
  promoCode: string | null;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "membership_type",
    nullable: true,
  })
  membershipType: EMembershipType | null;

  @OneToOne(() => Appointment, (appointment) => appointment.discountAssociation, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_associations_appointments_FK",
  })
  appointment: Appointment;

  @ManyToOne(() => PromoCampaign, (promoCampaign) => promoCampaign.discountAssociations, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "promo_campaign_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_associations_promo_campaigns_FK",
  })
  promoCampaign?: PromoCampaign | null;

  @ManyToOne(() => MembershipAssignment, (membershipAssignment) => membershipAssignment.discountAssociations, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "membership_assignment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "discount_associations_membership_assignments_FK",
  })
  membershipAssignment?: MembershipAssignment | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
