import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "src/modules/companies/entities";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { EmailsModule } from "src/modules/emails/emails.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { CompaniesDepositChargeController } from "src/modules/companies-deposit-charge/controllers";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentItem, Company, CompanyDepositCharge]),
    StripeModule,
    NotificationModule,
    EmailsModule,
    HelperModule,
  ],
  providers: [CompaniesDepositChargeService],
  controllers: [CompaniesDepositChargeController],
  exports: [CompaniesDepositChargeService],
})
export class CompaniesDepositChargeModule {}
