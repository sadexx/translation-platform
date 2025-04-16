import { Module } from "@nestjs/common";
import { PaymentsController } from "src/modules/payments/controllers";
import {
  CorporatePaymentsService,
  GeneralPaymentsService,
  IndividualPaymentsService,
} from "src/modules/payments/services";
import { PdfModule } from "src/modules/pdf/pdf.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment, PaymentItem, IncomingPaymentsWaitList } from "src/modules/payments/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Appointment } from "src/modules/appointments/entities";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { PaypalModule } from "src/modules/paypal/paypal.module";
import { RatesModule } from "src/modules/rates/rates.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointment-failed-payment-cancel/appointment-failed-payment-cancel.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { PaymentsQueryOptionsService } from "src/modules/payments/services/payments-query-options.service";
import { Company } from "src/modules/companies/entities";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, UserRole, Appointment, PaymentItem, IncomingPaymentsWaitList, Company]),
    PdfModule,
    StripeModule,
    AwsS3Module,
    EmailsModule,
    PaypalModule,
    RatesModule,
    DiscountsModule,
    NotificationModule,
    AppointmentFailedPaymentCancelModule,
    HelperModule,
    CompaniesDepositChargeModule,
  ],
  providers: [IndividualPaymentsService, GeneralPaymentsService, PaymentsQueryOptionsService, CorporatePaymentsService],
  controllers: [PaymentsController],
  exports: [GeneralPaymentsService],
})
export class PaymentsModule {}
