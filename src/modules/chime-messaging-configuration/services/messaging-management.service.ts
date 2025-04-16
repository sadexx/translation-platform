import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, Repository } from "typeorm";
import { Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws-messaging-sdk/aws-messaging-sdk.service";
import { UploadFileToChannelDto } from "src/modules/chime-messaging-configuration/common/dto";
import { EChannelStatus, EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import { MessagingCreationService, MessagingIdentityService } from "src/modules/chime-messaging-configuration/services";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { Appointment } from "src/modules/appointments/entities";
import { ChannelEventDto } from "src/modules/web-socket-gateway/common/dto";
import { NUMBER_OF_DAYS_IN_WEEK } from "src/common/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments-shared/common/constants";
import { findOneOrFail } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class MessagingManagementService {
  private readonly lokiLogger = new LokiLogger(MessagingManagementService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChannelMembership)
    private readonly channelMembershipRepository: Repository<ChannelMembership>,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly messagingCreationService: MessagingCreationService,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
  ) {}

  public async joinChannel(id: string, user: ITokenUserData): Promise<void> {
    const userRole = await this.helperService.getUserRoleById(user.userRoleId, {
      user: true,
      profile: true,
      role: true,
    });

    if (!userRole.profile) {
      throw new BadRequestException("User has not completed their profile.");
    }

    const channel = await findOneOrFail(id, this.channelRepository, {
      where: { id },
      relations: { memberships: true, userRoles: true },
    });

    const isUserAlreadyMember = channel.memberships.some((membership) => membership.externalUserId === userRole.id);

    if (isUserAlreadyMember) {
      throw new BadRequestException("User is already a member of the channel.");
    }

    if (channel.memberships.length > 1) {
      throw new BadRequestException("Channel already has the maximum number of participants.");
    }

    if (channel.memberships.length > 0) {
      if (channel.status === EChannelStatus.NEW) {
        channel.status = EChannelStatus.IN_PROGRESS;
      }

      channel.userRoles.push(userRole);
      channel.resolvedDate = null;
      await this.channelRepository.save(channel);
    }

    await this.messagingCreationService.constructAndCreateChannelMembership(channel, userRole);

    return;
  }

  public async uploadFile(file: IFile, dto: UploadFileToChannelDto): Promise<string> {
    if (!file) {
      throw new NotFoundException("File not received.");
    }

    const channel = await findOneOrFail(dto.id, this.channelRepository, {
      where: { id: dto.id },
    });

    await this.channelRepository.update(dto.id, {
      fileKeys: channel.fileKeys ? [...channel.fileKeys, file.key] : [file.key],
    });

    return this.awsS3Service.getMediaObjectUrl(file.key);
  }

  public async handleChannelResolveProcess(appointmentId: string, interpreterId?: string): Promise<void> {
    const appointment = await this.helperService.getChannelAppointment(appointmentId);

    if (interpreterId) {
      await this.resolveChannelByInterpreter(appointment, interpreterId);
    } else {
      await this.resolveChannelForGroupOrSingleAppointment(appointment);
    }
  }

  private async resolveChannelByInterpreter(appointment: Appointment, interpreterId: string): Promise<void> {
    const shouldResolve =
      !appointment.appointmentsGroupId ||
      (await this.helperService.isInterpreterUnassignedFromGroupAppointments(
        interpreterId,
        appointment.appointmentsGroupId,
      ));

    if (shouldResolve) {
      await this.resolveChannelForGroupOrSingleAppointment(appointment, interpreterId);
    }
  }

  private async resolveChannelForGroupOrSingleAppointment(
    appointment: Appointment,
    interpreterId?: string,
  ): Promise<void> {
    if (!appointment.appointmentsGroupId && appointment.channelId) {
      await this.resolveAppointmentChannel(appointment.channelId);
    } else {
      await this.resolveChannelsForAppointmentGroup(appointment, interpreterId);
    }
  }

  public async resolveAppointmentChannel(id: string): Promise<void> {
    const channel = await findOneOrFail(id, this.channelRepository, { where: { id: id } });

    if (channel.status === EChannelStatus.INITIALIZED) {
      await this.channelRepository.remove(channel);
    } else {
      await this.channelRepository.update(id, {
        status: EChannelStatus.RESOLVED,
        resolvedDate: new Date(),
      });
    }
  }

  private async resolveChannelsForAppointmentGroup(appointment: Appointment, interpreterId?: string): Promise<void> {
    if (!appointment.appointmentsGroupId || !appointment.clientId) {
      return;
    }

    const channels = await this.channelRepository.find({
      where: {
        appointmentsGroupId: appointment.appointmentsGroupId,
        userRoles: { id: interpreterId ?? appointment.clientId },
      },
      relations: { userRoles: true },
    });

    const channelIds = channels.map((channel) => channel.id);
    const linkedAppointments = await this.helperService.getAppointmentsLinkedToChannelGroup(channelIds);

    const channelIdsToResolve: string[] = [];
    const channelsToRemove: Channel[] = [];

    for (const channel of channels) {
      const appointmentsByChannel = linkedAppointments.filter((appointment) => appointment.channelId === channel.id);
      const allLinkedAppointmentsCompleted = appointmentsByChannel.every((linkedAppointment) =>
        [...COMPLETED_APPOINTMENT_STATUSES, EAppointmentStatus.PENDING].includes(linkedAppointment.status),
      );

      if (allLinkedAppointmentsCompleted && channel.status === EChannelStatus.INITIALIZED) {
        channelsToRemove.push(channel);
      } else if (allLinkedAppointmentsCompleted) {
        channelIdsToResolve.push(channel.id);
      }
    }

    if (channelsToRemove.length > 0) {
      await this.channelRepository.remove(channelsToRemove);
    }

    if (channelIdsToResolve.length > 0) {
      await this.channelRepository.update(
        { id: In(channelIdsToResolve) },
        { status: EChannelStatus.RESOLVED, resolvedDate: new Date() },
      );
    }
  }

  public async handleWebSocketChannelUpdate(channel: Channel): Promise<MessageOutput> {
    const updateData: Partial<Channel> = { updatingDate: new Date() };

    if (channel.status === EChannelStatus.INITIALIZED) {
      updateData.status = channel.type === EChannelType.SUPPORT ? EChannelStatus.NEW : EChannelStatus.IN_PROGRESS;
    }

    const result = await this.channelRepository.update(channel.id, updateData);

    if (!result.affected || result.affected === 0) {
      throw new BadRequestException("Failed to update channel.");
    } else {
      return { message: "Success" };
    }
  }

  public async incrementUnreadCounter(channel: Channel, senderId: string): Promise<void> {
    await this.channelMembershipRepository
      .createQueryBuilder()
      .update()
      .set({
        unreadMessagesCount: () => '"unread_messages_count" + 1',
      })
      .where("channel_id = :channelId", { channelId: channel.id })
      .andWhere("external_user_id != :senderId", { senderId })
      .execute();
  }

  public async resetUnreadCounterByUser(channelArn: string, userRoleId: string): Promise<void> {
    await this.channelMembershipRepository
      .createQueryBuilder()
      .update()
      .set({ unreadMessagesCount: 0 })
      .where("channel_id = (SELECT id FROM channels WHERE channel_arn = :channelArn)", { channelArn })
      .andWhere("external_user_id = :userRoleId", { userRoleId })
      .execute();
  }

  public async deleteChannelMessage(dto: ChannelEventDto): Promise<MessageOutput> {
    const { adminArn } = await this.messagingIdentityService.getConfig();

    if (!dto.messageId || !dto.channelArn) {
      throw new BadRequestException("Failed to delete channel message");
    }

    await this.awsMessagingSdkService.deleteChannelMessage(dto.channelArn, adminArn, dto.messageId);

    return { message: "Success" };
  }

  public async deleteOldChannels(): Promise<void> {
    const WEEKS = 3;
    const threeWeeksAgo = new Date();

    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - WEEKS * NUMBER_OF_DAYS_IN_WEEK);

    const channelsToDelete = await this.channelRepository.find({
      where: [
        {
          status: EChannelStatus.RESOLVED,
          resolvedDate: LessThan(threeWeeksAgo),
        },
        {
          status: EChannelStatus.INITIALIZED,
          creationDate: LessThan(threeWeeksAgo),
        },
      ],
    });

    if (channelsToDelete.length === 0) {
      return;
    }

    const { adminArn } = await this.messagingIdentityService.getConfig();

    for (const channel of channelsToDelete) {
      if (channel.channelArn) {
        await this.awsMessagingSdkService.deleteChannel(channel.channelArn, adminArn);
      }

      if (channel.fileKeys && channel.fileKeys.length > 0) {
        const objectsToDelete = channel.fileKeys.map((Key) => ({ Key }));
        await this.awsS3Service.deleteMediaObjects(objectsToDelete);
      }
    }

    const channelIds = channelsToDelete.map((channel) => channel.id);
    await this.channelRepository.delete({ id: In(channelIds) });

    this.lokiLogger.log(`Deleted ${channelsToDelete.length} resolved or initialized channels older than 3 weeks.`);
  }
}
