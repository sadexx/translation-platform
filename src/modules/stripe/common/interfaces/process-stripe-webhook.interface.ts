import { Message } from "@aws-sdk/client-sqs";

export interface IProcessStripeWebhook {
  message: Message;
}
