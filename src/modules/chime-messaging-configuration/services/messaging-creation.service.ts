import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws-messaging-sdk/aws-messaging-sdk.service";
import { CreateChannelDto } from "src/modules/chime-messaging-configuration/common/dto";
import { UserRole } from "src/modules/users-roles/entities";
import {
  EChannelMembershipType,
  EChannelStatus,
  EChannelType,
} from "src/modules/chime-messaging-configuration/common/enums";
import { Appointment } from "src/modules/appointments/entities";
import { ADMIN_ROLES, DEFAULT_EMPTY_VALUE, LFH_ADMIN_ROLES } from "src/common/constants";
import {
  ICreateChannelConfig,
  ICreateChannelMembershipConfig,
} from "src/modules/chime-messaging-configuration/common/interfaces";
import {
  MessagingIdentityService,
  MessagingManagementService,
  MessagingQueryService,
} from "src/modules/chime-messaging-configuration/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class MessagingCreationService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChannelMembership)
    private readonly channelMembershipRepository: Repository<ChannelMembership>,
    @Inject(forwardRef(() => MessagingManagementService))
    private readonly messagingManagementService: MessagingManagementService,
    @Inject(forwardRef(() => MessagingIdentityService))
    private readonly messagingIdentityService: MessagingIdentityService,
    @Inject(forwardRef(() => MessagingQueryService))
    private readonly messagingQueryService: MessagingQueryService,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
    private readonly helperService: HelperService,
  ) {}

  public async createChannel(user: ITokenUserData, dto: CreateChannelDto): Promise<Channel> {
    let channel: Channel;

    if (ADMIN_ROLES.includes(user.role) && dto.recipientId) {
      const existingChannel = await this.messagingQueryService.getExistingChannelForUser(user.userRoleId, dto);

      if (existingChannel) {
        return existingChannel;
      }

      channel = await this.createChannelByAdmin(user, dto);
    } else {
      if (dto.recipientId) {
        throw new ForbiddenException("Forbidden request.");
      }

      const existingChannel = await this.messagingQueryService.getExistingChannelForUser(user.userRoleId, dto);

      if (existingChannel) {
        return existingChannel;
      }

      channel = await this.createChannelByUser(user, dto);
    }

    await this.messagingManagementService.joinChannel(channel.id, user);

    return channel;
  }

  private async createChannelByAdmin(user: ITokenUserData, dto: CreateChannelDto): Promise<Channel> {
    if (!dto.recipientId) {
      throw new BadRequestException("recipientId should not be empty.");
    }

    const adminUserRole = await this.helperService.getUserRoleById(user.userRoleId, {
      user: true,
      profile: true,
      role: true,
    });
    const recipientUserRole = await this.helperService.getUserRoleById(dto.recipientId, {
      user: true,
      profile: true,
      role: true,
    });

    if (!adminUserRole.profile || !recipientUserRole.profile) {
      throw new BadRequestException("Admin or recipient has not completed their profile.");
    }

    const channel = await this.constructAndCreateChannel([adminUserRole, recipientUserRole]);

    await this.constructAndCreateChannelMembership(channel, recipientUserRole);

    await this.channelRepository.update(channel.id, {
      type: EChannelType.PRIVATE,
      resolvedDate: null,
    });

    return channel;
  }

  private async createChannelByUser(user: ITokenUserData, dto?: CreateChannelDto): Promise<Channel> {
    const userRole = await this.helperService.getUserRoleById(user.userRoleId, {
      user: true,
      profile: true,
      role: true,
    });

    if (!userRole.profile) {
      throw new BadRequestException("User has not completed their profile.");
    }

    const channel = await this.constructAndCreateChannel([userRole], dto?.appointmentId, dto?.appointmentsGroupId);

    return channel;
  }

  public async createAppointmentChannel(appointment: Appointment, interpreter: UserRole): Promise<void> {
    const existingChannel = await this.messagingQueryService.getExistingAppointmentChannel(appointment, interpreter);

    if (existingChannel) {
      await this.helperService.updateAppointmentChannel(appointment, existingChannel);

      return;
    }

    if (appointment.client && interpreter) {
      const channel = await this.constructAndCreateChannel(
        [appointment.client, interpreter],
        appointment.id,
        appointment.platformId,
        appointment.appointmentsGroupId ?? DEFAULT_EMPTY_VALUE,
      );

      await this.helperService.updateAppointmentChannel(appointment, channel);

      await this.constructAndCreateChannelMembership(channel, appointment.client);
      await this.constructAndCreateChannelMembership(channel, interpreter);

      await this.channelRepository.update(channel.id, {
        type: EChannelType.PRIVATE,
        resolvedDate: null,
      });
    }

    return;
  }

  private async constructAndCreateChannel(
    userRoles: UserRole[],
    appointmentId?: string,
    appointmentPlatformId?: string,
    appointmentGroupId?: string,
  ): Promise<Channel> {
    const { appInstanceArn, adminArn } = await this.messagingIdentityService.getConfig();

    const createChannelConfig = await this.constructChannelConfigurationDto(
      appointmentId,
      appointmentPlatformId,
      appointmentGroupId,
    );
    const channel = await this.createChannelConfiguration(createChannelConfig, userRoles);

    const createChannelCommand = await this.awsMessagingSdkService.createChannel(appInstanceArn, adminArn, channel);

    if (createChannelCommand.ChannelArn) {
      await this.channelRepository.update(channel.id, {
        channelArn: createChannelCommand.ChannelArn,
      });

      channel.channelArn = createChannelCommand.ChannelArn;
    }

    return channel;
  }

  private async createChannelConfiguration(dto: ICreateChannelConfig, userRoles: UserRole[]): Promise<Channel> {
    const newChannelConfiguration = this.channelRepository.create({
      ...dto,
      userRoles,
    });
    const savedChannelConfiguration = await this.channelRepository.save(newChannelConfiguration);

    return savedChannelConfiguration;
  }

  private async constructChannelConfigurationDto(
    appointmentId?: string,
    appointmentPlatformId?: string,
    appointmentsGroupId?: string,
    type: EChannelType = EChannelType.SUPPORT,
    status: EChannelStatus = EChannelStatus.INITIALIZED,
  ): Promise<ICreateChannelConfig> {
    const determinedAppointmentId = appointmentsGroupId ? null : appointmentId;
    const determinedAppointmentPlatformId = appointmentsGroupId ? null : appointmentPlatformId;

    return {
      type,
      status,
      appointmentsGroupId,
      appointmentId: determinedAppointmentId,
      appointmentPlatformId: determinedAppointmentPlatformId,
    };
  }

  public async constructAndCreateChannelMembership(channel: Channel, userRole: UserRole): Promise<void> {
    if (!userRole.instanceUserArn) {
      throw new NotFoundException("User instance ARN not found.");
    }

    const { adminArn } = await this.messagingIdentityService.getConfig();

    const createChannelMembershipConfig = await this.constructChannelMembershipConfigurationDto(channel, userRole);
    await this.createChannelMembershipConfiguration(createChannelMembershipConfig);

    if (channel.channelArn) {
      await this.awsMessagingSdkService.createChannelMembership(channel.channelArn, userRole.instanceUserArn, adminArn);
    }

    return;
  }

  private async createChannelMembershipConfiguration(dto: ICreateChannelMembershipConfig): Promise<void> {
    const newChannelMembershipConfiguration = this.channelMembershipRepository.create(dto);
    await this.channelMembershipRepository.save(newChannelMembershipConfiguration);

    return;
  }

  private async constructChannelMembershipConfigurationDto(
    channel: Channel,
    userRole: UserRole,
  ): Promise<ICreateChannelMembershipConfig> {
    return {
      externalUserId: userRole.id,
      userPlatformId: userRole.user.platformId,
      instanceUserArn: userRole.instanceUserArn,
      type: LFH_ADMIN_ROLES.includes(userRole.role.name)
        ? EChannelMembershipType.MODERATOR
        : EChannelMembershipType.MEMBER,
      name: userRole.profile.firstName,
      roleName: userRole.role.name,
      channel,
      user: userRole.user,
    };
  }
}
