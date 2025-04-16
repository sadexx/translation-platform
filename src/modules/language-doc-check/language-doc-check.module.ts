import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { LanguageDocCheckController } from "src/modules/language-doc-check/controllers";
import { EmailsModule } from "src/modules/emails/emails.module";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { InterpreterBadgeModule } from "src/modules/interpreter-badge/interpreter-badge.module";
import { LanguageDocCheckService } from "src/modules/language-doc-check/services/";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDocument, LanguageDocCheck, InterpreterProfile]),
    ActivationTrackingModule,
    UsersRolesModule,
    AwsS3Module,
    FileManagementModule,
    EmailsModule,
    InterpreterProfileModule,
    NotificationModule,
    InterpreterBadgeModule,
    HelperModule,
  ],
  providers: [LanguageDocCheckService],
  controllers: [LanguageDocCheckController],
})
export class LanguageDocCheckModule {}
