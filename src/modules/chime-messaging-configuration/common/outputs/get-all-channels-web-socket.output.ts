import { Channel } from "src/modules/chime-messaging-configuration/entities";

export interface IGetAllChannelsWebSocketOutput {
  privateChannels: Channel[];
  supportChannels: Channel[];
}
