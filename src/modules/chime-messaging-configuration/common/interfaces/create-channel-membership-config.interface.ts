import { EChannelMembershipType } from "src/modules/chime-messaging-configuration/common/enums";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { User } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";

export interface ICreateChannelMembershipConfig {
  externalUserId: string;
  userPlatformId: string;
  instanceUserArn: string | null;
  type: EChannelMembershipType;
  name: string;
  roleName: EUserRoleName;
  channel: Channel;
  user: User;
}
