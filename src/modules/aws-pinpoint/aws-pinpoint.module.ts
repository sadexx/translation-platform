import { Module } from "@nestjs/common";
import { AwsPinpointService } from "src/modules/aws-pinpoint/services";
import { AwsPinpointController } from "src/modules/aws-pinpoint/controllers";

@Module({
  imports: [],
  controllers: [AwsPinpointController],
  providers: [AwsPinpointService],
  exports: [AwsPinpointService],
})
export class AwsPinpointModule {}
