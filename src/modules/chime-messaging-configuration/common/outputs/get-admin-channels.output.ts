import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { PaginationOutput } from "src/common/outputs";

export interface GetAdminChannelsOutput extends PaginationOutput {
  data: Channel[];
}
