import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserAvatarsController } from "src/modules/user-avatars/controllers";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";
import { User } from "src/modules/users/entities";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { SessionsModule } from "src/modules/sessions/sessions.module";
import { InterpreterBadgeModule } from "src/modules/interpreter-badge/interpreter-badge.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAvatarRequest, User]),
    AwsS3Module,
    NotificationModule,
    UsersRolesModule,
    FileManagementModule,
    SessionsModule,
    InterpreterBadgeModule,
  ],
  controllers: [UserAvatarsController],
  providers: [UserAvatarsService],
  exports: [UserAvatarsService],
})
export class UserAvatarsModule {}
