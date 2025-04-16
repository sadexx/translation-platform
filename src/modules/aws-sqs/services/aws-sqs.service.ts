import {
  DeleteMessageBatchCommand,
  GetQueueAttributesCommand,
  Message,
  QueueAttributeName,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ENVIRONMENT } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { LokiLogger } from "src/common/logger";
import { IAwsConfigSqs } from "src/modules/aws-sqs/common/interfaces";

@Injectable()
export class AwsSQSService {
  private readonly sqsClient: SQSClient;
  private readonly region: string;
  private readonly queueUrl: string;
  private readonly lokiLogger = new LokiLogger(AwsSQSService.name);

  constructor(private readonly configService: ConfigService) {
    const { credentials, region, sqsQueueUrl } = this.configService.getOrThrow<IAwsConfigSqs>("aws");
    this.region = region;
    this.queueUrl = sqsQueueUrl;

    if (ENVIRONMENT === EEnvironment.PRODUCTION) {
      this.sqsClient = new SQSClient({ region: this.region });
    } else {
      this.sqsClient = new SQSClient({
        credentials,
        region: this.region,
      });
    }
  }

  public async getApproximateNumberOfMessages(): Promise<number> {
    try {
      const params = {
        QueueUrl: this.queueUrl,
        AttributeNames: [QueueAttributeName.ApproximateNumberOfMessages],
      };

      const { Attributes } = await this.sqsClient.send(new GetQueueAttributesCommand(params));

      return Number(Attributes!.ApproximateNumberOfMessages);
    } catch (error) {
      this.lokiLogger.error(`Failed to get queue attributes: ${(error as Error).message}`);
      throw new ServiceUnavailableException("Failed to get queue attributes");
    }
  }

  public async pollMessages(): Promise<Message[]> {
    try {
      const params = {
        AttributeNames: [QueueAttributeName.All],
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      };

      const { Messages } = await this.sqsClient.send(new ReceiveMessageCommand(params));

      if (Messages && Messages.length > 0) {
        this.lokiLogger.log(`Received ${Messages.length} messages.`);
        const receiptHandles = Messages.map((message) => message.ReceiptHandle!);
        await this.deleteMessages(receiptHandles);

        return Messages;
      }
    } catch (error) {
      this.lokiLogger.error(`Failed to receive AWS-SQS messages: ${(error as Error).message}`);
      throw new ServiceUnavailableException("Failed to receive AWS-SQS messages");
    }

    return [];
  }

  public async deleteMessages(receiptHandles: string[]): Promise<void> {
    try {
      const entries = receiptHandles.map((receiptHandle, index) => ({
        Id: index.toString(),
        ReceiptHandle: receiptHandle,
      }));

      const deleteParams = {
        QueueUrl: this.queueUrl,
        Entries: entries,
      };

      await this.sqsClient.send(new DeleteMessageBatchCommand(deleteParams));
      this.lokiLogger.log("AWS-SQS Messages deleted successfully");
    } catch (error) {
      this.lokiLogger.error(`Failed to delete AWS-SQS messages: ${(error as Error).message}`);
      throw new ServiceUnavailableException("Failed to delete AWS-SQS messages");
    }
  }
}
