import { EUserRoleName } from "src/modules/roles/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IThirdPartyAuthData {
  email: string;
  role?: EUserRoleName;
  fullName?: string;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  clientUserAgent: string;
  clientIPAddress: string;
}
