import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailsModule } from "src/modules/emails/emails.module";
import { ResetPasswordService, UserProfilesService, UsersService } from "src/modules/users/services";
import { User, UserDocument, UserProfile } from "src/modules/users/entities";
import { AwsPinpointModule } from "src/modules/aws-pinpoint/aws-pinpoint.module";
import { AddressAndDeviceAuthenticationMiddleware } from "src/modules/auth/common/middlewares";
import { ResetPasswordController, UserProfilesController, UsersController } from "src/modules/users/controllers";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { JwtResetPasswordModule } from "src/modules/tokens/common/libs/reset-password-token";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { JwtRestorationModule } from "src/modules/tokens/common/libs/restoration-token";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { UserAvatarsModule } from "src/modules/user-avatars/user-avatars.module";
import { InterpreterBadgeModule } from "src/modules/interpreter-badge/interpreter-badge.module";
import { Address } from "src/modules/addresses/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { MockModule } from "src/modules/mock/mock.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDocument, UserProfile, Company, UserRole, Address]),
    JwtResetPasswordModule,
    UsersRolesModule,
    AwsPinpointModule,
    EmailsModule,
    ActivationTrackingModule,
    JwtRestorationModule,
    InterpreterProfileModule,
    AwsS3Module,
    FileManagementModule,
    NotificationModule,
    UserAvatarsModule,
    InterpreterBadgeModule,
    HelperModule,
    MockModule,
  ],
  providers: [UsersService, UserProfilesService, ResetPasswordService],
  controllers: [UsersController, UserProfilesController, ResetPasswordController],
  exports: [UsersService, UserProfilesService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AddressAndDeviceAuthenticationMiddleware).forRoutes(ResetPasswordController);
  }
}
