import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DiscountHoldersService, DiscountsService } from "src/modules/discounts/services";
import { DiscountAssociation, DiscountHolder } from "src/modules/discounts/entities";
import { PromoCampaignsModule } from "src/modules/promo-campaigns/promo-campaigns.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DiscountHolder, DiscountAssociation]),
    forwardRef(() => MembershipsModule),
    PromoCampaignsModule,
  ],
  providers: [DiscountsService, DiscountHoldersService],
  exports: [DiscountsService, DiscountHoldersService],
})
export class DiscountsModule {}
