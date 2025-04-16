import { Module } from "@nestjs/common";
import { AwsChimeSdkService } from "src/modules/aws-chime-sdk/aws-chime-sdk.service";

@Module({
  providers: [AwsChimeSdkService],
  exports: [AwsChimeSdkService],
})
export class AwsChimeSdkModule {}
