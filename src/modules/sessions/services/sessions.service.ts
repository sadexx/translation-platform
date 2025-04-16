import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { hash, verify } from "argon2";
import { Repository } from "typeorm";
import { Session } from "src/modules/sessions/entities";
import { IStartSessionData, TokensPayloadWithoutDeviceData } from "src/modules/auth/common/interfaces";
import { OneRoleLoginOutput } from "src/modules/auth/common/outputs";
import { TokensService } from "src/modules/tokens/services";
import { GetSessionData, IUpsertSessionData, VerifySessionData } from "src/modules/sessions/common/interfaces";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { ESortOrder } from "src/common/enums";

@Injectable()
export class SessionsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    private readonly tokensService: TokensService,
  ) {}

  public async startSession(data: IStartSessionData): Promise<OneRoleLoginOutput> {
    const tokens = await this.selectTokens(data);

    await this.deleteDuplicateSessionsByDevice(data.deviceId);

    await this.upsert({
      ...data,
      refreshToken: tokens.refreshToken,
    });

    return tokens;
  }

  public async updateActiveSession(data: IStartSessionData): Promise<OneRoleLoginOutput> {
    const tokens = await this.selectTokens(data);

    await this.updateSession({
      ...data,
      refreshToken: tokens.refreshToken,
    });

    return tokens;
  }

  private async selectTokens(payload: IStartSessionData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenPayload: TokensPayloadWithoutDeviceData = {
      userId: payload.userId,
      userRoleId: payload.userRoleId,
      userRole: payload.userRole,
      clientIPAddress: payload.clientIPAddress,
      clientUserAgent: payload.clientUserAgent,
    };

    if (!payload.isRequiredInfoFulfilled) {
      return await this.tokensService.createRequiredInfoTokens(tokenPayload);
    } else if (!payload.isActive) {
      return await this.tokensService.createActivationTokens(tokenPayload);
    } else {
      return await this.tokensService.createFullAccessTokens(tokenPayload);
    }
  }

  private async upsert(upsertSessionData: IUpsertSessionData): Promise<void> {
    const SESSIONS_LIMIT = 3;

    const hashedRefreshToken = await hash(upsertSessionData.refreshToken, {
      timeCost: this.configService.getOrThrow<number>("hashing.argon2TimeCost"),
    });
    const refreshTokenExpirationTimeSeconds = this.configService.getOrThrow<number>(
      "jwt.refresh.expirationTimeSeconds",
    );

    const userSessions = await this.sessionsRepository.find({
      where: { userId: upsertSessionData.userId },
      order: { creationDate: ESortOrder.DESC },
    });

    if (userSessions.length >= SESSIONS_LIMIT) {
      await this.deleteOldestSession(upsertSessionData.userId);
    }

    await this.sessionsRepository.save({
      userId: upsertSessionData.userId,
      userRoleId: upsertSessionData.userRoleId,
      platform: upsertSessionData.platform,
      deviceId: upsertSessionData.deviceId,
      deviceToken: upsertSessionData.deviceToken,
      iosVoipToken: upsertSessionData.iosVoipToken,
      clientIPAddress: upsertSessionData.clientIPAddress,
      clientUserAgent: upsertSessionData.clientUserAgent,
      refreshToken: hashedRefreshToken,
      refreshTokenExpirationDate: new Date(
        Date.now() + refreshTokenExpirationTimeSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND,
      ),
    });
  }

  private async updateSession(upsertSessionData: IUpsertSessionData): Promise<void> {
    const hashedRefreshToken = await hash(upsertSessionData.refreshToken, {
      timeCost: this.configService.getOrThrow<number>("hashing.argon2TimeCost"),
    });
    const refreshTokenExpirationTimeSeconds = this.configService.getOrThrow<number>(
      "jwt.refresh.expirationTimeSeconds",
    );

    const userSession = await this.sessionsRepository.findOne({
      where: {
        userId: upsertSessionData.userId,
        platform: upsertSessionData.platform,
        deviceId: upsertSessionData.deviceId,
      },
      order: { updatingDate: ESortOrder.DESC },
    });

    if (!userSession) {
      throw new NotFoundException("Your session does not exist, re-login, please");
    }

    await this.sessionsRepository.update(userSession.id, {
      userId: upsertSessionData.userId,
      userRoleId: upsertSessionData.userRoleId,
      platform: upsertSessionData.platform,
      deviceId: upsertSessionData.deviceId,
      deviceToken: upsertSessionData.deviceToken,
      iosVoipToken: upsertSessionData.iosVoipToken,
      clientIPAddress: upsertSessionData.clientIPAddress,
      clientUserAgent: upsertSessionData.clientUserAgent,
      refreshToken: hashedRefreshToken,
      refreshTokenExpirationDate: new Date(
        Date.now() + refreshTokenExpirationTimeSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND,
      ),
      ...(upsertSessionData.isUpdateFirstStageToken && { firstStageToken: userSession.refreshToken }),
    });
  }

  public async verify(verifySessionData: VerifySessionData): Promise<Session> {
    const session = await this.get(verifySessionData);

    if (!session) {
      throw new NotFoundException("Can't find session with such refresh token");
    }

    const isRefreshTokenCorrect = await verify(session.refreshToken, verifySessionData.refreshToken);

    if (!isRefreshTokenCorrect) {
      const isOldRefreshTokenCorrect = session.firstStageToken
        ? await verify(session.firstStageToken, verifySessionData.refreshToken)
        : false;

      if (!isOldRefreshTokenCorrect) {
        throw new NotFoundException("Your token is out of date");
      }
    }

    return session;
  }

  private async deleteOldestSession(id: string): Promise<void> {
    const session = await this.sessionsRepository.findOne({
      where: { userId: id },
      order: { creationDate: ESortOrder.ASC },
    });

    if (!session) {
      throw new NotFoundException("Can't find session with such refresh token");
    }

    await this.sessionsRepository.remove(session);
  }

  private async get(getSessionData: GetSessionData): Promise<Session | null> {
    return this.sessionsRepository.findOne({
      where: {
        userId: getSessionData.userId,
        clientIPAddress: getSessionData.clientIPAddress,
        clientUserAgent: getSessionData.clientUserAgent,
      },
      order: {
        updatingDate: ESortOrder.DESC,
      },
    });
  }

  public async getLast(userId: string): Promise<Session | null> {
    return this.sessionsRepository.findOne({
      where: { userId: userId },
      order: {
        creationDate: ESortOrder.DESC,
      },
    });
  }

  private async deleteDuplicateSessionsByDevice(deviceId: string): Promise<void> {
    const sessions = await this.sessionsRepository.find({
      where: { deviceId: deviceId },
    });

    if (sessions.length >= 1) {
      await this.sessionsRepository.remove(sessions);
    }
  }

  public async deleteCurrentSession(session: Session): Promise<void> {
    await this.sessionsRepository.remove(session);
  }
}
