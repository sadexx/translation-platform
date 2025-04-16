import { Message } from "@aws-sdk/client-sqs";

export interface IProcessSumSubWebhook {
  message: Message;
}
