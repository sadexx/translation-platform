import {
  EPromoCampaignCategory,
  EPromoCampaignDurationPeriod,
  EPromoCampaignStatus,
  EPromoCampaignType,
} from "src/modules/promo-campaigns/common/enums";

export interface ICreatePromoCampaign {
  name: string;
  promoCode: string;
  discount: number;
  discountMinutes: number | null;
  type: EPromoCampaignType;
  category: EPromoCampaignCategory;
  status: EPromoCampaignStatus;
  durationPeriod: EPromoCampaignDurationPeriod;
  startDate?: Date;
  endDate?: Date;
}
