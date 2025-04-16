import { EUserRoleName } from "src/modules/roles/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IGoogleWebUserData {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  clientUserAgent: string;
  clientIPAddress: string;
}
