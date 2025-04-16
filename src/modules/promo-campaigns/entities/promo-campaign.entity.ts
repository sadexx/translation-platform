import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import {
  EPromoCampaignCategory,
  EPromoCampaignDurationPeriod,
  EPromoCampaignStatus,
  EPromoCampaignType,
} from "src/modules/promo-campaigns/common/enums";
import { DiscountHolder } from "src/modules/discounts/entities/discount-holder.entity";
import { DiscountAssociation } from "src/modules/discounts/entities";

@Entity({ name: "promo_campaigns" })
export class PromoCampaign {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", name: "name", unique: true })
  name: string;

  @Column({ type: "varchar", name: "promo_code", unique: true })
  promoCode: string;

  @Column({ type: "integer", name: "discount" })
  discount: number;

  @Column({ type: "integer", name: "discount_minutes", nullable: true })
  discountMinutes: number | null;

  @Column({
    type: "enum",
    enum: EPromoCampaignType,
    name: "type",
  })
  type: EPromoCampaignType;

  @Column({
    type: "enum",
    enum: EPromoCampaignCategory,
    name: "category",
  })
  category: EPromoCampaignCategory;

  @Column({
    type: "enum",
    enum: EPromoCampaignStatus,
    name: "status",
  })
  status: EPromoCampaignStatus;

  @Column({
    type: "enum",
    enum: EPromoCampaignDurationPeriod,
    name: "duration_period",
  })
  durationPeriod: EPromoCampaignDurationPeriod;

  @Column({ type: "timestamptz", name: "start_date", nullable: true })
  startDate: Date | null;

  @Column({ type: "timestamptz", name: "end_date", nullable: true })
  endDate: Date | null;

  @OneToMany(() => DiscountHolder, (discountHolder) => discountHolder.promoCampaign, { nullable: true })
  discountHolders?: DiscountHolder[] | null;

  @OneToMany(() => DiscountAssociation, (discountAssociation) => discountAssociation.promoCampaign, { nullable: true })
  discountAssociations?: DiscountAssociation[] | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
