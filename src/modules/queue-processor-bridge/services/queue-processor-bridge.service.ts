import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Job } from "bullmq";
import { LokiLogger } from "src/common/logger";
import { IQueueProcessor } from "src/modules/queue-processors/common/interfaces";
import { EQueueType } from "src/modules/queues/common/enums";
import { IQueueJobType } from "src/modules/queues/common/interfaces";

@Injectable()
export class QueueProcessorBridgeService implements IQueueProcessor {
  private static processorInstance: IQueueProcessor | null = null;
  private readonly logger = new LokiLogger(QueueProcessorBridgeService.name);

  registerProcessor(processor: IQueueProcessor): void {
    this.logger.debug("Queue processor registered successfully");
    QueueProcessorBridgeService.processorInstance = processor;
  }

  async processJob(queueEnum: EQueueType, job: Job<IQueueJobType>): Promise<void> {
    if (!QueueProcessorBridgeService.processorInstance) {
      this.logger.error("Queue processor not registered. Check module initialization order.");
      throw new InternalServerErrorException(
        "Queue processor not registered. Ensure QueueProcessorsModule is imported in the app.",
      );
    }

    return QueueProcessorBridgeService.processorInstance.processJob(queueEnum, job);
  }
}
