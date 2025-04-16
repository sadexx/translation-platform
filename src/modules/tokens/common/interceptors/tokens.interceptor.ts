import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { ITokenData } from "src/modules/tokens/common/interfaces";
import { Response } from "express";

@Injectable()
export class TokensInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: ITokenData) => {
        const res = context.switchToHttp().getResponse<Response>();
        const isDebug = this.configService.getOrThrow<string>("LOG_LEVEL") === "debug";

        if (data?.accessToken) {
          res.cookie("accessToken", data.accessToken, {
            sameSite: isDebug ? "none" : "lax",
            secure: isDebug,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_ACCESS_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.refreshToken) {
          res.cookie("refreshToken", data.refreshToken, {
            sameSite: isDebug ? "none" : "lax",
            secure: isDebug,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_REFRESH_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.emailConfirmationToken) {
          res.cookie("emailConfirmationToken", data.emailConfirmationToken, {
            sameSite: isDebug ? "none" : "lax",
            secure: isDebug,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_EMAIL_CONFIRMATION_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.registrationToken) {
          res.cookie("registrationToken", data.registrationToken, {
            sameSite: isDebug ? "none" : "lax",
            secure: isDebug,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_REGISTRATION_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.roleSelectionToken) {
          res.cookie("roleSelectionToken", data.roleSelectionToken, {
            sameSite: isDebug ? "none" : "lax",
            secure: isDebug,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_ROLE_SELECTION_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        return {
          accessToken: data?.accessToken,
          refreshToken: data?.refreshToken,
          emailConfirmationToken: data?.emailConfirmationToken,
          registrationToken: data?.registrationToken,
          registrationStep: data?.registrationStep,
          roleSelectionToken: data?.roleSelectionToken,
          availableRoles: data?.availableRoles,
        };
      }),
    );
  }
}
