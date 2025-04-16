import { IsInt, Min } from "class-validator";
import { CreateCorporatePromoCampaignDto } from "src/modules/promo-campaigns/common/dto";

export class CreateCorporateMixedPromo extends CreateCorporatePromoCampaignDto {
  @IsInt()
  @Min(1)
  discountMinutes: number;
}
