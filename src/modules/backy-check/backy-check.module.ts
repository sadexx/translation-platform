import { Module } from "@nestjs/common";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { BackyCheckSdkService, BackyCheckService } from "src/modules/backy-check/services";
import { BackyCheckController } from "src/modules/backy-check/controllers";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDocument } from "src/modules/users/entities";
import { BackyCheck } from "src/modules/backy-check/entities";
import { JwtModule } from "@nestjs/jwt";
import { EmailsModule } from "src/modules/emails/emails.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { MockModule } from "src/modules/mock/mock.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    AwsS3Module,
    FileManagementModule,
    EmailsModule,
    UsersRolesModule,
    ActivationTrackingModule,
    MockModule,
    NotificationModule,
    HelperModule,
    TypeOrmModule.forFeature([UserDocument, BackyCheck]),
    JwtModule.register({
      global: false,
    }),
  ],
  providers: [BackyCheckService, BackyCheckSdkService],
  controllers: [BackyCheckController],
  exports: [BackyCheckService, BackyCheckSdkService],
})
export class BackyCheckModule {}
