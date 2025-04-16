import { EUserRoleName } from "src/modules/roles/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IThirdPartyAuthWebState {
  role: EUserRoleName;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string;
  iosVoipToken: string;
  IPAddress: string;
  userAgent: string;
}
