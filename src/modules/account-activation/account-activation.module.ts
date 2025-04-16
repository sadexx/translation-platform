import { Module } from "@nestjs/common";
import { AccountActivationController, CompanyActivationController } from "src/modules/account-activation/controllers";
import {
  AccountActivationService,
  CompanyActivationService,
  StepInfoService,
} from "src/modules/account-activation/services";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { SessionsModule } from "src/modules/sessions/sessions.module";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, UserRole]),
    UsersRolesModule,
    SessionsModule,
    NotificationModule,
    HelperModule,
  ],
  controllers: [AccountActivationController, CompanyActivationController],
  providers: [AccountActivationService, StepInfoService, CompanyActivationService],
  exports: [AccountActivationService, CompanyActivationService],
})
export class AccountActivationModule {}
