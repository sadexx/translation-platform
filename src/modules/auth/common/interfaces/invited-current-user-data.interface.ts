import { ICurrentUserData } from "src/modules/users/common/interfaces";

export type IInvitedCurrentUserData = Omit<ICurrentUserData, "clientUserAgent" | "clientIPAddress">;
