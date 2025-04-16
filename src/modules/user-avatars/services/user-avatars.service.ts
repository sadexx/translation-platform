import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { NotificationService } from "src/modules/notifications/services";
import { UsersRolesService } from "src/modules/users-roles/services";
import { UserAvatarsManualDecisionDto } from "src/modules/user-avatars/common/dto";
import { EAvatarStatus } from "src/modules/user-avatars/common/enums";
import { avatarMap } from "src/modules/user-avatars/common/constants/constants";
import { EUserGender } from "src/modules/users/common/enums";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";
import { SessionsService } from "src/modules/sessions/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { LokiLogger } from "src/common/logger";
import { RedisService } from "src/modules/redis/services";
import { ADMIN_ROLES } from "src/common/constants";
import { findOneOrFail } from "src/common/utils";
import { UserRole } from "src/modules/users-roles/entities";

@Injectable()
export class UserAvatarsService {
  private readonly lokiLogger = new LokiLogger(UserAvatarsService.name);
  private readonly isMediaBucket = true;

  constructor(
    @InjectRepository(UserAvatarRequest)
    private readonly userAvatarsRepository: Repository<UserAvatarRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly awsS3Service: AwsS3Service,
    private readonly notificationService: NotificationService,
    private readonly usersRolesService: UsersRolesService,
    private readonly sessionsService: SessionsService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly redisService: RedisService,
  ) {}

  public async getAvatarRequestByUserId(userId: string): Promise<UserAvatarRequest> {
    const userAvatarRequest = await findOneOrFail(
      userId,
      this.userAvatarsRepository,
      { where: { user: { id: userId } } },
      "user.id",
    );

    return userAvatarRequest;
  }

  public async uploadAvatar(user: ITokenUserData, file: IFile): Promise<MessageOutput> {
    if (!file) {
      throw new NotFoundException("File not received.");
    }

    if (user.role !== EUserRoleName.SUPER_ADMIN) {
      await this.handleUserAvatarUpload(user.id, file.key);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      await this.handleAdminAvatarUpload(user.id, file.key);
    }

    return { message: "Avatar uploaded successfully." };
  }

  private async handleUserAvatarUpload(userId: string, fileKey: string): Promise<void> {
    const userAvatarRequest = await this.userAvatarsRepository.findOne({
      select: {
        user: {
          isDefaultAvatar: true,
        },
      },
      where: {
        user: { id: userId },
      },
      relations: { user: true },
    });

    if (userAvatarRequest) {
      if (!userAvatarRequest.user.isDefaultAvatar) {
        await this.removeAvatarFromS3(userAvatarRequest.avatarUrl);
      }

      await this.userAvatarsRepository.remove(userAvatarRequest);
    }

    const newUserAvatarRequest = this.userAvatarsRepository.create({
      user: { id: userId },
      avatarUrl: this.awsS3Service.getMediaObjectUrl(fileKey),
    });

    await this.userAvatarsRepository.save(newUserAvatarRequest);
  }

  private async handleAdminAvatarUpload(userId: string, fileKey: string): Promise<void> {
    const existingUser = await findOneOrFail(userId, this.userRepository, {
      select: {
        avatarUrl: true,
        isDefaultAvatar: true,
      },
      where: { id: userId },
    });

    if (!existingUser.isDefaultAvatar) {
      await this.removeAvatarFromS3(existingUser.avatarUrl);
    }

    await this.userRepository.update(userId, {
      avatarUrl: this.awsS3Service.getMediaObjectUrl(fileKey),
      isDefaultAvatar: false,
    });
  }

  public async userAvatarManualDecision(dto: UserAvatarsManualDecisionDto): Promise<void> {
    const userAvatarRequest = await findOneOrFail(dto.id, this.userAvatarsRepository, {
      select: {
        user: {
          id: true,
          isDefaultAvatar: true,
          avatarUrl: true,
          userRoles: {
            id: true,
          },
        },
      },
      where: { id: dto.id },
      relations: { user: { userRoles: { role: true, interpreterProfile: true } } },
    });

    const lastSession = await this.sessionsService.getLast(userAvatarRequest.user.id);
    const userRole = userAvatarRequest.user.userRoles.find((userRole) => userRole.id === lastSession?.userRoleId);

    if (dto.status === EAvatarStatus.VERIFIED) {
      await this.processVerifiedAvatar(userAvatarRequest, userRole);
    }

    if (dto.status === EAvatarStatus.DECLINED) {
      await this.processDeclinedAvatar(userAvatarRequest, dto, userRole);
    }
  }

  private async processVerifiedAvatar(userAvatarRequest: UserAvatarRequest, userRole?: UserRole): Promise<void> {
    if (!userAvatarRequest.user.isDefaultAvatar) {
      await this.removeAvatarFromS3(userAvatarRequest.user.avatarUrl);
    }

    await this.userRepository.update(userAvatarRequest.user.id, {
      avatarUrl: userAvatarRequest.avatarUrl,
      isDefaultAvatar: false,
    });
    await this.userAvatarsRepository.remove(userAvatarRequest);

    if (userRole) {
      await this.sendAvatarVerifiedNotification(userRole.id);

      if (userRole.interpreterProfile?.interpreterBadgePdf) {
        await this.invalidateAvatarCache(userRole.id);
        this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
          this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
        });
      }
    }
  }

  private async processDeclinedAvatar(
    userAvatarRequest: UserAvatarRequest,
    dto: UserAvatarsManualDecisionDto,
    userRole?: UserRole,
  ): Promise<void> {
    await this.removeAvatarFromS3(userAvatarRequest.avatarUrl);
    await this.userAvatarsRepository.remove(userAvatarRequest);

    if (userRole && dto.declineReason) {
      await this.sendAvatarDeclinedNotification(userRole.id, dto.declineReason);
    }
  }

  public async removeAvatar(user: ITokenUserData): Promise<MessageOutput> {
    if (!user.id) {
      throw new NotFoundException("User not found.");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(user.id, user.role, {
      profile: true,
      user: true,
      interpreterProfile: true,
    });

    if (!userRole.user.isDefaultAvatar) {
      await this.removeAvatarFromS3(userRole.user.avatarUrl);
    }

    await this.setDefaultUserAvatar(user.id, userRole.profile.gender);

    if (userRole.interpreterProfile?.interpreterBadgePdf) {
      this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
      });
    }

    return { message: "Avatar removed successfully." };
  }

  private async removeAvatarFromS3(url: string | null): Promise<void> {
    if (!url) {
      return;
    }

    const key = this.awsS3Service.getKeyFromUrl(url);
    await this.awsS3Service.deleteObject(key, this.isMediaBucket);
  }

  public async setDefaultUserAvatar(id: string, gender: EUserGender = EUserGender.OTHER): Promise<void> {
    const avatarKey = avatarMap[gender];
    await this.userRepository.update(id, {
      avatarUrl: this.awsS3Service.getMediaObjectUrl(avatarKey),
      isDefaultAvatar: true,
    });
  }

  private async invalidateAvatarCache(userRoleId: string): Promise<void> {
    const CACHE_KEY = `base64avatar:${userRoleId}`;
    await this.redisService.del(CACHE_KEY);
  }

  private async sendAvatarVerifiedNotification(userRoleId: string): Promise<void> {
    this.notificationService.sendAvatarVerifiedNotification(userRoleId).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send avatar verified notification for userId: ${userRoleId}`, error.stack);
    });
  }

  private async sendAvatarDeclinedNotification(userRoleId: string, declineReason: string): Promise<void> {
    this.notificationService.sendAvatarDeclinedNotification(userRoleId, declineReason).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send avatar declined notification for userId: ${userRoleId}`, error.stack);
    });
  }
}
