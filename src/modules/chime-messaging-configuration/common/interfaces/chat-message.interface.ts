import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";

export interface IChatMessage {
  channelId: string;
  channelType: EChannelType;
}
