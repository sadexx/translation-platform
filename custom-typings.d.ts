import { EUserRoleName } from "./src/modules/roles/common/enums";

declare module "express" {
  export interface Request extends Request {
    startTime: [number, number];
    clientInfo: {
      IPAddress: string;
      userAgent: string;
    };
    user: {
      id: string;
      email: string;
      userRoleId: string;
      role: EUserRoleName;
      isOauth?: boolean;
      isInvitation?: boolean;
      clientUserAgent: string;
      clientIPAddress: string;
    };
  }
}

declare module "socket.io" {
  export interface Socket {
    user: {
      id: string;
      userRoleId: string;
      role: EUserRoleName;
      clientUserAgent: string;
      clientIPAddress: string;
    };
  }
}
