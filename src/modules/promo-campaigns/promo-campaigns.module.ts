import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import {
  PromoCampaignsQueryOptionsService,
  PromoCampaignsManagementService,
  PromoCampaignsCreationService,
  PromoCampaignsValidationService,
} from "src/modules/promo-campaigns/services";
import { PromoCampaignsController } from "src/modules/promo-campaigns/controllers";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCampaign]),
    forwardRef(() => DiscountsModule),
    UsersRolesModule,
    HelperModule,
  ],
  providers: [
    PromoCampaignsManagementService,
    PromoCampaignsCreationService,
    PromoCampaignsQueryOptionsService,
    PromoCampaignsValidationService,
  ],
  controllers: [PromoCampaignsController],
  exports: [PromoCampaignsManagementService, PromoCampaignsValidationService],
})
export class PromoCampaignsModule {}
