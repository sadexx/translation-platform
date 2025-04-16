import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IRedisConnectionData } from "src/modules/redis/common/interfaces";
import { NUMBER_OF_SECONDS_IN_MINUTE } from "src/common/constants";
import { REDIS_CLIENT } from "src/modules/redis/common/constants";
import Redis from "ioredis";

@Injectable()
export class RedisService {
  private readonly defaultTtlSeconds: number;

  public constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {
    const redisConfig = this.configService.getOrThrow<IRedisConnectionData>("redis");
    this.defaultTtlSeconds = redisConfig.ttlMinutes * NUMBER_OF_SECONDS_IN_MINUTE;
  }

  public async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  public async set(key: string, value: string | number, ttlSeconds?: number): Promise<void> {
    await this.setWithTtl(key, String(value), ttlSeconds);
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redisClient.get(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  public async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.setWithTtl(key, JSON.stringify(value), ttlSeconds);
  }

  public async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  public async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  public async delManyByPattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern);

    if (keys && keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  public async incr(key: string): Promise<number> {
    return await this.redisClient.incr(key);
  }

  public async decr(key: string): Promise<number> {
    return await this.redisClient.decr(key);
  }

  private async setWithTtl(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;

    if (ttl > 0) {
      await this.redisClient.set(key, value, "EX", ttl);
    } else {
      await this.redisClient.set(key, value);
    }
  }
}
