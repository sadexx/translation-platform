import { Module } from "@nestjs/common";
import { AwsMessagingSdkService } from "src/modules/aws-messaging-sdk/aws-messaging-sdk.service";

@Module({
  providers: [AwsMessagingSdkService],
  exports: [AwsMessagingSdkService],
})
export class AwsMessagingSdkModule {}
