import { Module } from "@nestjs/common";
import { PdfBuilderService, PdfService, PdfTemplatesService } from "src/modules/pdf/services";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Company } from "src/modules/companies/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { StripeModule } from "src/modules/stripe/stripe.module";

@Module({
  imports: [TypeOrmModule.forFeature([Payment, UserRole, Company]), AwsS3Module, HelperModule, StripeModule],
  providers: [PdfService, PdfBuilderService, PdfTemplatesService],
  exports: [PdfBuilderService],
})
export class PdfModule {}
