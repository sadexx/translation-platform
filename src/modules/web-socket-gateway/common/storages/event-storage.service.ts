import { Injectable } from "@nestjs/common";
import { EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { RedisService } from "src/modules/redis/services";

@Injectable()
export class EventStorageService {
  constructor(private readonly redisService: RedisService) {}

  public async setEventCache<T>(userRoleId: string, event: EWebSocketEventTypes, data: T): Promise<void> {
    const key = this.getKey(userRoleId, event);
    await this.redisService.setJson(key, data);
  }

  public async getEventCache(userRoleId: string, event: EWebSocketEventTypes): Promise<string | null> {
    const key = this.getKey(userRoleId, event);

    return await this.redisService.get(key);
  }

  public async clearUserEventCache(userRoleId: string): Promise<void> {
    await this.redisService.delManyByPattern(`wsCache:${userRoleId}:*`);
  }

  private getKey(userRoleId: string, eventType: EWebSocketEventTypes): string {
    return `wsCache:${userRoleId}:${eventType}`;
  }
}
