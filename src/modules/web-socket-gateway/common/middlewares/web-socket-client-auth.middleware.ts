/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Socket } from "socket.io";
import { LokiLogger } from "src/common/logger";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { IJwtPayload } from "src/modules/tokens/common/interfaces";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";

const lokiLogger = new LokiLogger("WebSocketClientAuthMiddleware");
const ALLOWED_ROLES: EUserRoleName[] = [
  EUserRoleName.IND_CLIENT,
  EUserRoleName.CORPORATE_CLIENTS_IND_USER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
];

export const WebSocketClientAuthMiddleware = (jwtAccessService: JwtAccessService) => {
  return (client: Socket, next: (err?: any) => void): void => {
    const token = extractTokenFromSocket(client);

    if (!token) {
      lokiLogger.error("Unauthorized: No token provided");

      return next(new UnauthorizedException("Unauthorized"));
    }

    try {
      const payload: IJwtPayload = jwtAccessService.verify(token);

      if (!ALLOWED_ROLES.includes(payload.userRole as EUserRoleName)) {
        lokiLogger.error(
          "Bad Request: Role does not permit this operation, role:" + (payload.userRole as EUserRoleName),
        );

        return next(new BadRequestException("User role does not permit this operation."));
      }

      client.user = {
        role: payload.userRole as EUserRoleName,
        userRoleId: payload.userRoleId,
        id: payload.userId,
        clientUserAgent: payload.clientUserAgent,
        clientIPAddress: payload.clientIPAddress,
      };

      next();
    } catch (error) {
      lokiLogger.error(`Unauthorized: Invalid token: ${(error as Error).message}, ${(error as Error).stack}`);
      next(new UnauthorizedException("Unauthorized"));
    }
  };
};

const extractTokenFromSocket = (socket: Socket): string | null => {
  const cookie = socket.handshake.headers.cookie;

  if (!cookie) {
    return null;
  }

  const cookies = cookie.split(";").map((c) => c.trim());
  const accessTokenCookie = cookies.find((c) => c.startsWith("accessToken="));
  const accessToken = accessTokenCookie ? accessTokenCookie.split("=")[1] : null;

  return accessToken;
};
