import { Module } from "@nestjs/common";
import { AwsSQSService, WebhookService } from "src/modules/aws-sqs/services";
import { WebhookController } from "src/modules/aws-sqs/controllers";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [QueueModule],
  providers: [WebhookService, AwsSQSService],
  controllers: [WebhookController],
  exports: [WebhookService],
})
export class AwsSQSModule {}
