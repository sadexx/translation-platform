import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { ConcessionCardService } from "src/modules/concession-card/services";
import { ConcessionCardController } from "src/modules/concession-card/controllers";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { EmailsModule } from "src/modules/emails/emails.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDocument, UserConcessionCard]),
    ActivationTrackingModule,
    UsersRolesModule,
    AwsS3Module,
    FileManagementModule,
    EmailsModule,
    NotificationModule,
    HelperModule,
  ],
  providers: [ConcessionCardService],
  controllers: [ConcessionCardController],
})
export class ConcessionCardModule {}
