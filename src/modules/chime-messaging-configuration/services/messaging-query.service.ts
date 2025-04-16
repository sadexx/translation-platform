import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Brackets,
  FindManyOptions,
  FindOneOptions,
  FindOptionsSelect,
  FindOptionsWhere,
  IsNull,
  MoreThan,
  Not,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws-messaging-sdk/aws-messaging-sdk.service";
import {
  CreateChannelDto,
  GetAdminChannelsDto,
  GetAppointmentChannels,
  GetChannelMessagesDto,
  GetUserChannelsDto,
} from "src/modules/chime-messaging-configuration/common/dto";
import { EChannelStatus, EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import { ESortOrder } from "src/common/enums";
import {
  GetAdminChannelsOutput,
  GetChannelMessagesOutput,
  GetUserChannelsOutput,
  IGetAllChannelsWebSocketOutput,
} from "src/modules/chime-messaging-configuration/common/outputs";
import {
  MessagingIdentityService,
  MessagingManagementService,
} from "src/modules/chime-messaging-configuration/services";
import { Appointment } from "src/modules/appointments/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ActiveChannelStorageService } from "src/modules/web-socket-gateway/common/storages";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ADMIN_ROLES, CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { findOneOrFail } from "src/common/utils";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class MessagingQueryService {
  private readonly lokiLogger = new LokiLogger(MessagingQueryService.name);
  private readonly channelSelectFields: FindOptionsSelect<Channel> = {
    memberships: {
      id: true,
      externalUserId: true,
      userPlatformId: true,
      instanceUserArn: true,
      type: true,
      name: true,
      roleName: true,
      unreadMessagesCount: true,
      user: {
        id: true,
        avatarUrl: true,
      },
    },
    userRoles: {
      id: true,
    },
  };

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
    private readonly activeChannelStorageService: ActiveChannelStorageService,
    private readonly helperService: HelperService,
  ) {}

  public async getChannelMessages(dto: GetChannelMessagesDto, user: ITokenUserData): Promise<GetChannelMessagesOutput> {
    const { adminArn } = await this.messagingIdentityService.getConfig();
    const { ChannelMessages = [], NextToken = null } = await this.awsMessagingSdkService.listChannelMessages(
      dto.channelArn,
      adminArn,
      dto.nextToken,
    );

    this.activeChannelStorageService.setActiveChannel(user.userRoleId, dto.channelArn).catch((error: Error) => {
      this.lokiLogger.error(`Failed to set active channel for userRoleId: ${user.userRoleId}`, error.stack);
    });
    this.messagingManagementService.resetUnreadCounterByUser(dto.channelArn, user.userRoleId).catch((error: Error) => {
      this.lokiLogger.error(`Failed to reset unread counter for userRoleId: ${user.userRoleId}`, error.stack);
    });

    return {
      messages: ChannelMessages,
      nextToken: NextToken,
    };
  }

  public async getAdminChannelsByType(dto: GetAdminChannelsDto, user: ITokenUserData): Promise<GetAdminChannelsOutput> {
    const queryBuilder = this.buildBaseChannelQuery(dto.type);

    if (dto.type === EChannelType.PRIVATE) {
      queryBuilder.andWhere("userRoles.id = :userRoleId", { userRoleId: user.userRoleId });
    }

    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    queryBuilder.orderBy("channel.updatingDate", ESortOrder.DESC).skip(dto.offset).take(dto.limit);
    const [channels, count] = await queryBuilder.getManyAndCount();

    return {
      data: channels,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getAppointmentChannels(dto: GetAppointmentChannels): Promise<GetAdminChannelsOutput> {
    const CHANNEL_TYPE = EChannelType.PRIVATE;
    const queryBuilder = this.buildBaseChannelQuery(CHANNEL_TYPE);

    queryBuilder
      .andWhere(
        `channel.id IN (
        SELECT channel_memberships.channel_id
        FROM channel_memberships
        WHERE channel_memberships.role_name IN (:...roles)
        GROUP BY channel_memberships.channel_id
        HAVING COUNT(DISTINCT channel_memberships.role_name) = 2
      )`,
        { roles: [...CLIENT_ROLES, ...INTERPRETER_ROLES] },
      )
      .andWhere("(channel.appointmentId IS NOT NULL OR channel.appointmentsGroupId IS NOT NULL)");

    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    queryBuilder.orderBy("channel.updatingDate", ESortOrder.DESC).skip(dto.offset).take(dto.limit);
    const [channels, count] = await queryBuilder.getManyAndCount();

    return {
      data: channels,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getUserChannelsByType(dto: GetUserChannelsDto, user: ITokenUserData): Promise<GetUserChannelsOutput> {
    const queryBuilder = this.buildBaseChannelQuery(dto.type).andWhere("userRoles.id = :userRoleId", {
      userRoleId: user.userRoleId,
    });

    if (dto.cursor) {
      queryBuilder.andWhere("channel.updatingDate < :cursor", { cursor: dto.cursor });
    }

    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    queryBuilder.orderBy("channel.updatingDate", ESortOrder.DESC).take(dto.limit);
    const channels = await queryBuilder.getMany();
    const nextCursor = channels.length === dto.limit ? channels[channels.length - 1].updatingDate : null;

    return {
      data: channels,
      nextCursor,
    };
  }

  private buildBaseChannelQuery(type: EChannelType): SelectQueryBuilder<Channel> {
    return this.channelRepository
      .createQueryBuilder("channel")
      .leftJoin("channel.memberships", "memberships")
      .addSelect([
        "memberships.id",
        "memberships.externalUserId",
        "memberships.userPlatformId",
        "memberships.instanceUserArn",
        "memberships.type",
        "memberships.name",
        "memberships.roleName",
        "memberships.unreadMessagesCount",
      ])
      .leftJoin("memberships.user", "user")
      .addSelect(["user.id", "user.avatarUrl"])
      .leftJoin("channel.userRoles", "userRoles")
      .addSelect(["userRoles.id"])
      .where("channel.type = :type", { type })
      .andWhere("channel.status != :status", { status: EChannelStatus.INITIALIZED });
  }

  private applySearch(queryBuilder: SelectQueryBuilder<Channel>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("channel.platformId ILIKE :search", { search: searchTerm })
          .orWhere("channel.appointmentPlatformId ILIKE :search", { search: searchTerm })
          .orWhere("channel.appointmentsGroupId ILIKE :search", { search: searchTerm })
          .orWhere("memberships.userPlatformId ILIKE :search", { search: searchTerm })
          .orWhere("memberships.name ILIKE :search", { search: searchTerm })
          .orWhere("CAST(memberships.roleName AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  public async getChannelById(id: string): Promise<Channel> {
    const channel = await findOneOrFail(id, this.channelRepository, {
      select: this.channelSelectFields,
      where: { id },
      relations: { memberships: { user: true } },
    });

    return channel;
  }

  public async getChannelAppointmentInformation(id: string): Promise<Appointment | Appointment[]> {
    const channel = await findOneOrFail(id, this.channelRepository, {
      where: { id },
      select: {
        appointmentId: true,
        appointmentsGroupId: true,
      },
    });

    if (channel.appointmentsGroupId) {
      const appointments = await this.helperService.getChannelAppointments(channel.appointmentsGroupId);

      return appointments;
    }

    if (channel.appointmentId) {
      const appointment = await this.helperService.getChannelAppointment(channel.appointmentId);

      return appointment;
    }

    throw new NotFoundException("No appointment information found for the channel.");
  }

  public async getExistingChannelForUser(userRoleId: string, dto: CreateChannelDto): Promise<Channel | null> {
    const whereCondition: FindOptionsWhere<Channel> = {
      type: dto.recipientId ? EChannelType.PRIVATE : EChannelType.SUPPORT,
      status: Not(EChannelStatus.RESOLVED),
      userRoles: { id: userRoleId },
      appointmentId: dto.appointmentId ?? IsNull(),
      appointmentsGroupId: dto.appointmentsGroupId ?? IsNull(),
      ...(dto.recipientId && { memberships: { externalUserId: dto.recipientId } }),
    };

    const existingChannel = await this.channelRepository.findOne({
      select: this.channelSelectFields,
      where: whereCondition,
      relations: { memberships: { user: true }, userRoles: true },
    });

    if (dto.recipientId && existingChannel && existingChannel.memberships.length > 1) {
      return existingChannel;
    }

    return existingChannel ?? null;
  }

  public async getExistingAppointmentChannel(appointment: Appointment, interpreter: UserRole): Promise<Channel | null> {
    let existingChannel: Channel | null = null;

    if (appointment.appointmentsGroupId) {
      existingChannel = await this.channelRepository.findOne({
        where: { appointmentsGroupId: appointment.appointmentsGroupId, userRoles: { id: interpreter.id } },
      });
    } else {
      existingChannel = await this.channelRepository.findOne({
        where: { appointmentId: appointment.id, userRoles: { id: interpreter.id } },
      });
    }

    if (existingChannel?.status === EChannelStatus.RESOLVED) {
      await this.channelRepository.update(existingChannel.id, {
        status: EChannelStatus.INITIALIZED,
        resolvedDate: null,
      });
    }

    return existingChannel ?? null;
  }

  public async getNewChannelsForWebSocket(
    userRoleId: string,
    userRole: EUserRoleName,
    lastChecked: Date,
  ): Promise<IGetAllChannelsWebSocketOutput> {
    const findOptionsPrivateChannels: FindManyOptions<Channel> = {
      select: this.channelSelectFields,
      where: {
        type: EChannelType.PRIVATE,
        updatingDate: MoreThan(lastChecked),
        status: Not(EChannelStatus.INITIALIZED),
        userRoles: { id: userRoleId },
      },
      relations: { memberships: { user: true }, userRoles: true },
      order: { updatingDate: ESortOrder.ASC },
    };

    const findOptionsSupportChannels: FindManyOptions<Channel> = {
      select: this.channelSelectFields,
      where: {
        type: EChannelType.SUPPORT,
        updatingDate: MoreThan(lastChecked),
        status: Not(EChannelStatus.INITIALIZED),
        ...(ADMIN_ROLES.includes(userRole) ? {} : { userRoles: { id: userRoleId } }),
      },
      relations: { memberships: { user: true }, userRoles: true },
      order: { updatingDate: ESortOrder.ASC },
    };

    const allPrivateChannels = await this.getAllChannels(findOptionsPrivateChannels);
    const allSupportChannels = await this.getAllChannels(findOptionsSupportChannels);

    return {
      privateChannels: [...allPrivateChannels],
      supportChannels: [...allSupportChannels],
    };
  }

  public async getAllChannels(findOneOptions: FindOneOptions<Channel>): Promise<Channel[]> {
    return await this.channelRepository.find(findOneOptions);
  }
}
