import {
  MessageRequest,
  MessageType,
  PinpointClient,
  SendMessagesCommand,
  SendMessagesCommandOutput,
} from "@aws-sdk/client-pinpoint";
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ENVIRONMENT } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { LokiLogger } from "src/common/logger";
import { generateCode } from "src/common/utils";
import { IAwsConfigPinpoint } from "src/modules/aws-pinpoint/common/interfaces";

@Injectable()
export class AwsPinpointService {
  private readonly lokiLogger = new LokiLogger(AwsPinpointService.name);
  private readonly pinpointSmsV2Client: PinpointSMSVoiceV2Client;
  private readonly pinpointClient: PinpointClient;
  private readonly PINPOINT_APPLICATION_ID: string;
  public constructor(private readonly configService: ConfigService) {
    const { credentials, region, pinpointApplicationId } = this.configService.getOrThrow<IAwsConfigPinpoint>("aws");
    this.PINPOINT_APPLICATION_ID = pinpointApplicationId;

    if (ENVIRONMENT === EEnvironment.PRODUCTION) {
      this.pinpointSmsV2Client = new PinpointSMSVoiceV2Client({ region: region });

      this.pinpointClient = new PinpointClient({ region: region });
    } else {
      this.pinpointSmsV2Client = new PinpointSMSVoiceV2Client({
        region: region,
        credentials: credentials,
      });

      this.pinpointClient = new PinpointClient({
        region: region,
        credentials: credentials,
      });
    }
  }

  public async sendVerificationCode(phoneNumber: string): Promise<string> {
    try {
      const confirmationCode = generateCode();
      const command = new SendTextMessageCommand({
        DestinationPhoneNumber: phoneNumber,
        OriginationIdentity: "LFH",
        MessageBody: `Verification code: ${confirmationCode}. It will expire in ${this.configService.getOrThrow<number>(
          "redis.ttlMinutes",
        )} minutes`,
        MessageType: MessageType.TRANSACTIONAL,
      });

      await this.pinpointSmsV2Client.send(command);

      return confirmationCode;
    } catch (error) {
      this.lokiLogger.error(`Error sending SMS: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to send SMS");
    }
  }

  public async sendPushNotification(param: MessageRequest): Promise<SendMessagesCommandOutput> {
    try {
      const sendMessagesCommand = new SendMessagesCommand({
        ApplicationId: this.PINPOINT_APPLICATION_ID,
        MessageRequest: param,
      });

      const response = await this.pinpointClient.send(sendMessagesCommand);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Error sending push notification: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Failed to send push notification");
    }
  }
}
