import { EUserRoleName } from "src/modules/roles/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";
import { ICurrentUserData } from "src/modules/users/common/interfaces";

export interface IChangeUserRoleData {
  user: ICurrentUserData;
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
}
