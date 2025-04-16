/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { IRequestWithRefreshToken } from "src/modules/auth/common/interfaces";
import { IJwtPayload } from "src/modules/tokens/common/interfaces";
import { TokenStrategies } from "src/config/strategies";
import { SessionsService } from "src/modules/sessions/services";

@Injectable()
export class JwtRequiredInfoRefreshStrategy extends PassportStrategy(
  Strategy,
  TokenStrategies.JWT_REQUIRED_INFO_REFRESH_STRATEGY,
) {
  constructor(
    protected readonly configService: ConfigService,
    private readonly sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: IRequestWithRefreshToken): any => request.body.refreshToken,
        (request: Request): any => request.cookies?.["refreshToken"],
      ]),
      secretOrKey: configService.getOrThrow<string>("JWT_REQUIRED_INFO_REFRESH_TOKEN_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(
    req: IRequestWithRefreshToken,
    payload: IJwtPayload,
  ): Promise<{
    id: string;
    role: string;
    userRoleId: string;
    email: string;
    clientUserAgent: string;
    clientIPAddress: string;
  }> {
    const refreshToken = req.cookies?.["refreshToken"] || req.body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException("Unauthorized");
    }

    await this.sessionsService.verify({
      ...payload,
      refreshToken,
    });

    return {
      id: payload.userId,
      role: payload.userRole,
      userRoleId: payload.userRoleId,
      email: payload.email,
      clientUserAgent: payload.clientUserAgent,
      clientIPAddress: payload.clientIPAddress,
    };
  }
}
