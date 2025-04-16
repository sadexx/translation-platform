import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EPaymentStatus } from "src/modules/payments/common/enums";
import { ECurrencies } from "src/modules/payments/common/enums/currencies.enum";
import { Payment } from "src/modules/payments/entities/payment.entity";
import { EMembershipType } from "src/modules/memberships/common/enums";

@Entity("payment_items")
export class PaymentItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Payment, (payment) => payment.items, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "payment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "payment_items_payments_FK",
  })
  payment: Payment;

  @Column({ type: "varchar", name: "external_id", nullable: true })
  externalId: string | null;

  @Column({ type: "varchar", name: "transfer_id", nullable: true })
  transferId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "amount", nullable: false })
  amount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "gst_amount", nullable: false })
  gstAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "full_amount", nullable: false })
  fullAmount: number;

  @Column({ type: "enum", enum: ECurrencies, name: "currency", nullable: false })
  currency: ECurrencies;

  @Column({ type: "enum", enum: EPaymentStatus, name: "status", nullable: false })
  status: EPaymentStatus;

  @Column({ type: "varchar", name: "receipt", nullable: true })
  receipt: string | null;

  @Column({ type: "varchar", name: "note", nullable: true })
  note?: string | null | undefined;

  @Column({ type: "int", name: "applied_promo_discounts_percent", nullable: true })
  appliedPromoDiscountsPercent: number | null;

  @Column({ type: "int", name: "applied_membership_discounts_percent", nullable: true })
  appliedMembershipDiscountsPercent: number | null;

  @Column({ type: "int", name: "applied_promo_discounts_minutes", nullable: true })
  appliedPromoDiscountsMinutes: number | null;

  @Column({ type: "int", name: "applied_membership_free_minutes", nullable: true })
  appliedMembershipFreeMinutes: number | null;

  @Column({ type: "varchar", name: "applied_promo_code", nullable: true })
  appliedPromoCode: string | null;

  @Column({
    type: "enum",
    enum: EMembershipType,
    name: "applied_membership_type",
    nullable: true,
  })
  appliedMembershipType: EMembershipType | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_membership_minutes",
    nullable: true,
  })
  amountOfAppliedDiscountByMembershipMinutes: number | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_membership_discount",
    nullable: true,
  })
  amountOfAppliedDiscountByMembershipDiscount: number | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    name: "amount_of_applied_discount_by_promo_code",
    nullable: true,
  })
  amountOfAppliedDiscountByPromoCode: number | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
