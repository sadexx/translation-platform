import {
  CreateCorporateMixedPromo,
  CreateCorporatePromoCampaignDto,
  CreatePersonalMixedPromo,
  CreatePersonalPromoCampaignDto,
} from "src/modules/promo-campaigns/common/dto";

export type PromoCampaignDto =
  | CreatePersonalPromoCampaignDto
  | CreateCorporatePromoCampaignDto
  | CreatePersonalMixedPromo
  | CreateCorporateMixedPromo;
