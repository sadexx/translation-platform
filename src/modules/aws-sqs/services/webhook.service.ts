import { Injectable } from "@nestjs/common";
import { AwsSQSService } from "src/modules/aws-sqs/services/aws-sqs.service";
import { Message } from "@aws-sdk/client-sqs";
import { ConfigService } from "@nestjs/config";
import { EExtWebhookGroupNames } from "src/modules/aws-sqs/common/enums";
import { IAwsConfigSqs } from "src/modules/aws-sqs/common/interfaces";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class WebhookService {
  private readonly lokiLogger = new LokiLogger(WebhookService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly awsSQSService: AwsSQSService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async startCheckStatusWebhook(): Promise<void> {
    await this.processAwsSQSQueue();
    const { intervalTimeMinutes } = this.configService.getOrThrow<IAwsConfigSqs>("aws");
    const interval =
      intervalTimeMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE +
      Math.floor(Math.random() * NUMBER_OF_MILLISECONDS_IN_MINUTE);
    setTimeout(() => void this.startCheckStatusWebhook(), interval);
  }

  public async getManualStatusCheckWebhook(): Promise<void> {
    this.lokiLogger.log("Starting: Manual status checks");
    await this.processAwsSQSQueue();
    this.lokiLogger.log("Finished: Manual status checks");
  }

  private async processAwsSQSQueue(): Promise<void> {
    const sqsMessages = await this.awsSQSService.pollMessages();

    if (sqsMessages.length > 0) {
      const sumSubMessages: Message[] = [];
      const docusignMessages: Message[] = [];
      const stripeMessages: Message[] = [];

      for (const message of sqsMessages) {
        if (message.Attributes!.MessageGroupId === EExtWebhookGroupNames.SUMSUB) {
          sumSubMessages.push(message);
        }

        if (message.Attributes!.MessageGroupId === EExtWebhookGroupNames.DOCUSIGN) {
          docusignMessages.push(message);
        }

        if (message.Attributes!.MessageGroupId === EExtWebhookGroupNames.STRIPE) {
          stripeMessages.push(message);
        }
      }

      this.lokiLogger.log(`Received ${sumSubMessages.length} SumSub messages`);
      this.lokiLogger.log(`Received ${docusignMessages.length} Docusign messages`);
      this.lokiLogger.log(`Received ${stripeMessages.length} Stripe messages`);

      await this.queueInitializeService.addProcessSumSubWebhookQueue(sumSubMessages);
      await this.queueInitializeService.addProcessDocusignWebhookQueue(docusignMessages);
      await this.queueInitializeService.addProcessStripeWebhookQueue(stripeMessages);

      await this.processAwsSQSQueue();
    }

    if (sqsMessages.length === 0) {
      return;
    }
  }
}
