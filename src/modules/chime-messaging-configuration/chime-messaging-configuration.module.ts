import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppInstanceConfig, Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import {
  MessagingCreationService,
  MessagingIdentityService,
  MessagingManagementService,
  MessagingQueryService,
} from "src/modules/chime-messaging-configuration/services";
import { AwsMessagingSdkModule } from "src/modules/aws-messaging-sdk/aws-messaging-sdk.module";
import { ChimeMessagingConfigurationController } from "src/modules/chime-messaging-configuration/controllers";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { ActiveChannelStorageService } from "src/modules/web-socket-gateway/common/storages";
import { HelperModule } from "src/modules/helper/helper.module";
import { UserRole } from "src/modules/users-roles/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelMembership, AppInstanceConfig, UserRole]),
    AwsMessagingSdkModule,
    FileManagementModule,
    AwsS3Module,
    HelperModule,
  ],
  controllers: [ChimeMessagingConfigurationController],
  providers: [
    MessagingIdentityService,
    MessagingManagementService,
    MessagingCreationService,
    MessagingQueryService,
    ActiveChannelStorageService,
  ],
  exports: [MessagingIdentityService, MessagingManagementService, MessagingCreationService, MessagingQueryService],
})
export class ChimeMessagingConfigurationModule {}
