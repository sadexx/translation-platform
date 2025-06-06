import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtResetPasswordService extends JwtService {
  constructor() {
    super({
      secret: process.env.JWT_RESET_PASSWORD_TOKEN_SECRET,
      signOptions: {
        expiresIn: `${process.env.JWT_RESET_PASSWORD_TOKEN_EXPIRATION_TIME}s`,
      },
    });
  }
}
