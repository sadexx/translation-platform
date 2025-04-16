import { Expose, Type } from "class-transformer";
import { PromoCampaignOutput } from "src/modules/promo-campaigns/common/outputs";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class DiscountHolderOutput {
  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  creationDate: Date;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  updatingDate: Date;

  @Expose()
  @Type(() => PromoCampaignOutput)
  promoCampaign: PromoCampaignOutput;
}
