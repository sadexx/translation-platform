import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import {
  CorporatePaymentInformationService,
  GeneralPaymentInformationService,
  IndividualPaymentInformationService,
} from "src/modules/payment-information/services";
import {
  CorporatePaymentInformationController,
  GeneralPaymentInformationController,
  IndividualPaymentInformationController,
} from "src/modules/payment-information/controllers";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentInformation, UserRole]),
    StripeModule,
    ActivationTrackingModule,
    PaypalModule,
    HelperModule,
  ],
  providers: [
    IndividualPaymentInformationService,
    CorporatePaymentInformationService,
    GeneralPaymentInformationService,
  ],
  controllers: [
    IndividualPaymentInformationController,
    CorporatePaymentInformationController,
    GeneralPaymentInformationController,
  ],
  exports: [GeneralPaymentInformationService],
})
export class PaymentInformationModule {}
