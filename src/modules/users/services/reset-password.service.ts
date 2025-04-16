import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "bcrypt";
import { Repository } from "typeorm";
import { ISendChangePasswordCodeData, IVerifyChangePasswordCodeData } from "src/modules/users/common/interfaces";
import { User } from "src/modules/users/entities";
import { EmailsService } from "src/modules/emails/services";
import { UsersService } from "src/modules/users/services";
import { JwtResetPasswordService } from "src/modules/tokens/common/libs/reset-password-token";
import { AwsPinpointService } from "src/modules/aws-pinpoint/services";
import { RedisService } from "src/modules/redis/services";
import { NUMBER_OF_MINUTES_IN_HOUR } from "src/common/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MockService } from "src/modules/mock/services";

@Injectable()
export class ResetPasswordService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailsService: EmailsService,
    private readonly awsPinpointService: AwsPinpointService,
    private readonly userService: UsersService,
    private readonly jwtResetPasswordService: JwtResetPasswordService,
    private readonly mockService: MockService,
  ) {}

  public async sendRequestToChangePassword(data: ISendChangePasswordCodeData): Promise<void> {
    const { user, isIdentifiedByPhone, isIdentifiedByEmail } = await this.userService.getByEmailOrPhone({
      identification: data.identification,
      relations: { userRoles: { role: true } },
    });

    if (!user) {
      throw new NotFoundException("Such account doesn't exist");
    }

    if (isIdentifiedByPhone) {
      const verificationCode = await this.awsPinpointService.sendVerificationCode(user.phoneNumber);
      await this.redisService.set(user.phoneNumber, verificationCode);
    }

    if (isIdentifiedByEmail) {
      const resetPasswordToken = await this.jwtResetPasswordService.signAsync({
        ...data,
        email: user.email,
        userId: user.id,
      });
      const redirectionLink =
        this.configService.getOrThrow<string>("frontend.resetPasswordRedirectionLink") + `?token=${resetPasswordToken}`;
      const linkDuration = this.configService.getOrThrow<number>("jwt.resetPassword.expirationTimeSeconds");
      const linkDurationString = linkDuration / NUMBER_OF_MINUTES_IN_HOUR + " minutes";
      await this.emailsService.sendPasswordResetLink(user.email, redirectionLink, linkDurationString);
    }
  }

  public async verifyPasswordResetCode(data: IVerifyChangePasswordCodeData): Promise<string> {
    await this.verifyCode(data.phone, data.code);
    const user = await this.userService.getByPhone({ phoneNumber: data.phone });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const accessToken = await this.jwtResetPasswordService.signAsync({
      ...data,
      email: user.email,
      userId: user.id,
    });

    return this.configService.getOrThrow<string>("frontend.resetPasswordRedirectionLink") + `?token=${accessToken}`;
  }

  public async changePassword(user: ITokenUserData, newPassword: string): Promise<void> {
    await this.userRepository.update(user.id, {
      password: await hash(newPassword, this.configService.getOrThrow<number>("hashing.bcryptSaltRounds")),
    });
  }

  public async verifyCode(key: string, receivedCode: string, isDeleted = true): Promise<boolean> {
    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    if (mockEnabled) {
      const mock = this.mockService.mockVerifyCode(key);

      if (mock.isMocked) {
        return true;
      }
    }

    const savedCode = await this.redisService.get(key);

    if (savedCode !== receivedCode) {
      throw new NotFoundException("Your code is incorrect");
    }

    if (isDeleted) {
      await this.redisService.del(key);
    }

    return true;
  }
}
