import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Membership, MembershipAssignment, MembershipPrice } from "src/modules/memberships/entities";
import { MembershipAssignmentsService, MembershipsService } from "src/modules/memberships/services";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { MembershipsController } from "src/modules/memberships/controllers";
import { EmailsModule } from "src/modules/emails/emails.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { PdfModule } from "src/modules/pdf/pdf.module";
import { QueueModule } from "src/modules/queues/queues.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership, MembershipPrice, MembershipAssignment, Payment, PaymentItem]),
    forwardRef(() => DiscountsModule),
    StripeModule,
    PdfModule,
    EmailsModule,
    AwsS3Module,
    QueueModule,
    HelperModule,
  ],
  providers: [MembershipsService, MembershipAssignmentsService],
  controllers: [MembershipsController],
  exports: [MembershipsService, MembershipAssignmentsService],
})
export class MembershipsModule {}
