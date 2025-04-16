import { Module, OnModuleInit } from "@nestjs/common";
import { QueueProcessorService } from "src/modules/queue-processors/services";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { QueueProcessorBridgeModule } from "src/modules/queue-processor-bridge/queue-processor-bridge.module";
import { ModuleRef } from "@nestjs/core";
import { QueueProcessorBridgeService } from "src/modules/queue-processor-bridge/services";
import { WebhookProcessorModule } from "src/modules/webhook-processor/webhook-processor.module";

@Module({
  imports: [QueueProcessorBridgeModule, MembershipsModule, StripeModule, DiscountsModule, WebhookProcessorModule],
  providers: [QueueProcessorService],
  exports: [],
})
export class QueueProcessorsModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private bridgeService: QueueProcessorBridgeService,
  ) {}

  onModuleInit(): void {
    const queueProcessor = this.moduleRef.get(QueueProcessorService);
    this.bridgeService.registerProcessor(queueProcessor);
  }
}
