import { IsInt, Min } from "class-validator";
import { CreatePersonalPromoCampaignDto } from "src/modules/promo-campaigns/common/dto";

export class CreatePersonalMixedPromo extends CreatePersonalPromoCampaignDto {
  @IsInt()
  @Min(1)
  discountMinutes: number;
}
