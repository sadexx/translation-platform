import { EUserRoleName } from "src/modules/roles/common/enums";
import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IVerifyData {
  email: string;
  role: EUserRoleName;
  verificationCode: string;
  isInvitation?: boolean;
  platform?: EPlatformType;
  deviceId?: string;
  deviceToken?: string;
  IPAddress?: string;
  userAgent?: string;
}
