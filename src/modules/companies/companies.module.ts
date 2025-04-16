import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailsModule } from "src/modules/emails/emails.module";
import { Company, CompanyDocument } from "src/modules/companies/entities";
import {
  CompaniesDocumentsService,
  CompaniesEmployeeService,
  CompaniesQueryOptionsService,
  CompaniesQueryService,
  CompaniesService,
} from "src/modules/companies/services";
import {
  CompaniesController,
  CompaniesDocumentsController,
  CompaniesEmployeeController,
} from "src/modules/companies/controllers";
import { User } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { UserRole } from "src/modules/users-roles/entities";
import { JwtRestorationModule } from "src/modules/tokens/common/libs/restoration-token";
import { AuthModule } from "src/modules/auth/auth.module";
import { UserAvatarsModule } from "src/modules/user-avatars/user-avatars.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { JwtRegistrationModule } from "src/modules/tokens/common/libs/registration-token";
import { UsersModule } from "src/modules/users/users.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, Address, CompanyDocument, UserRole, CompanyDepositCharge]),
    EmailsModule,
    JwtRegistrationModule,
    FileManagementModule,
    AwsS3Module,
    JwtRestorationModule,
    AuthModule,
    UserAvatarsModule,
    UsersRolesModule,
    UsersModule,
    HelperModule,
    CompaniesDepositChargeModule,
  ],
  providers: [
    CompaniesService,
    CompaniesDocumentsService,
    CompaniesEmployeeService,
    CompaniesQueryService,
    CompaniesQueryOptionsService,
  ],
  controllers: [CompaniesController, CompaniesDocumentsController, CompaniesEmployeeController],
  exports: [CompaniesService, CompaniesQueryService],
})
export class CompaniesModule {}
