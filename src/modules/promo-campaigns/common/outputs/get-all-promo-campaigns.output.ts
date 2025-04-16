import { PaginationOutput } from "src/common/outputs";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";

export class GetAllPromoCampaignsOutput extends PaginationOutput {
  data: PromoCampaign[];
}
