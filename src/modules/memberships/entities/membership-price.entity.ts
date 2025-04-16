import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { Membership } from "src/modules/memberships/entities";
import { ECurrencies } from "src/modules/payments/common/enums";

@Entity({ name: "membership_prices" })
export class MembershipPrice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", name: "stripe_price_id" })
  stripePriceId: string;

  @Column({
    type: "enum",
    enum: EMembershipPricingRegion,
    name: "region",
  })
  region: EMembershipPricingRegion;

  @Column({ type: "integer", name: "price" })
  price: number;

  @Column({ type: "integer", name: "gst_rate", nullable: true })
  gstRate: number | null;

  @Column({
    type: "enum",
    enum: ECurrencies,
    name: "currency",
  })
  currency: ECurrencies;

  @ManyToOne(() => Membership, (membership) => membership.membershipPrices, { onDelete: "CASCADE" })
  membership: Membership;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
