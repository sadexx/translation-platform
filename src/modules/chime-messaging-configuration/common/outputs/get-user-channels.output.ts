import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { PaginationCursorOutput } from "src/common/outputs";

export interface GetUserChannelsOutput extends PaginationCursorOutput {
  data: Channel[];
}
