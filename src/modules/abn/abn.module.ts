import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AbnController } from "src/modules/abn/controllers";
import { AbnService } from "src/modules/abn/services";
import { AbnCheck } from "src/modules/abn/entities";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { MockModule } from "src/modules/mock/mock.module";
import { User } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { EmailsModule } from "src/modules/emails/emails.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AbnCheck, User, Company]),
    ActivationTrackingModule,
    MockModule,
    EmailsModule,
    UsersRolesModule,
    HelperModule,
  ],
  providers: [AbnService],
  controllers: [AbnController],
  exports: [AbnService],
})
export class AbnModule {}
