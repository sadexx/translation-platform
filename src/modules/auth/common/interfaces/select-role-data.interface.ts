import { EUserRoleName } from "src/modules/roles/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface ISelectRoleData {
  userId: string;
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  IPAddress: string;
  userAgent: string;
}
