import { Expose } from "class-transformer";
import {
  EPromoCampaignCategory,
  EPromoCampaignStatus,
  EPromoCampaignType,
} from "src/modules/promo-campaigns/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class PromoCampaignOutput {
  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  name: string;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  type: EPromoCampaignType;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  category: EPromoCampaignCategory;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  status: EPromoCampaignStatus;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  creationDate: Date;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  updatingDate: Date;

  @Expose({
    groups: [EUserRoleName.SUPER_ADMIN],
  })
  deletionDate: Date;
}
