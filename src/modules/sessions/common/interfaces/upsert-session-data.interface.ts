import { EPlatformType } from "src/modules/sessions/common/enum";

export interface IUpsertSessionData {
  userId: string;
  userRoleId: string;
  platform: EPlatformType;
  deviceId: string;
  deviceToken: string | null;
  iosVoipToken: string | null;
  clientUserAgent: string;
  clientIPAddress: string;
  refreshToken: string;
  isUpdateFirstStageToken?: boolean;
}

export type VerifySessionData = Omit<IUpsertSessionData, "platform" | "deviceId" | "deviceToken" | "iosVoipToken">;

export type GetSessionData = Omit<
  IUpsertSessionData,
  "platform" | "deviceId" | "deviceToken" | "iosVoipToken" | "refreshToken"
>;
