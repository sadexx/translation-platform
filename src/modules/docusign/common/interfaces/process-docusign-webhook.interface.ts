import { Message } from "@aws-sdk/client-sqs";

export interface IProcessDocusignWebhook {
  message: Message;
}
