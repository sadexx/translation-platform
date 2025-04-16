import { Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  MessagingCreationService,
  MessagingManagementService,
  MessagingQueryService,
} from "src/modules/chime-messaging-configuration/services";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import {
  CreateChannelDto,
  GetAdminChannelsDto,
  GetAppointmentChannels,
  GetChannelMessagesDto,
  GetUserChannelsDto,
  UploadFileToChannelDto,
} from "src/modules/chime-messaging-configuration/common/dto";
import { CurrentUser } from "src/common/decorators";
import {
  GetAdminChannelsOutput,
  GetChannelMessagesOutput,
  GetUserChannelsOutput,
} from "src/modules/chime-messaging-configuration/common/outputs";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { IFile } from "src/modules/file-management/common/interfaces";
import { UUIDParamDto } from "src/common/dto";
import { Appointment } from "src/modules/appointments/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("chime/channels")
export class ChimeMessagingConfigurationController {
  constructor(
    private readonly messagingManagementService: MessagingManagementService,
    private readonly messagingCreationService: MessagingCreationService,
    private readonly messagingQueryService: MessagingQueryService,
  ) {}

  @Get("messages")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  async getChannelMessages(
    @Query() dto: GetChannelMessagesDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetChannelMessagesOutput> {
    return this.messagingQueryService.getChannelMessages(dto, user);
  }

  @Get("admin")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAdminChannelsByType(
    @Query() dto: GetAdminChannelsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetAdminChannelsOutput> {
    return this.messagingQueryService.getAdminChannelsByType(dto, user);
  }

  @Get("appointments")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAppointmentChannels(@Query() dto: GetAppointmentChannels): Promise<GetAdminChannelsOutput> {
    return this.messagingQueryService.getAppointmentChannels(dto);
  }

  @Get("user")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  async getUserChannelsByType(
    @Query() dto: GetUserChannelsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetUserChannelsOutput> {
    return this.messagingQueryService.getUserChannelsByType(dto, user);
  }

  @Get(":id")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  async getChannelById(@Param() { id }: UUIDParamDto): Promise<Channel> {
    return this.messagingQueryService.getChannelById(id);
  }

  @Get("appointment-information/:id")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  async getChannelAppointmentInformation(@Param() { id }: UUIDParamDto): Promise<Appointment | Appointment[]> {
    return this.messagingQueryService.getChannelAppointmentInformation(id);
  }

  @Post()
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  async createChannel(@CurrentUser() user: ITokenUserData, @Query() dto: CreateChannelDto): Promise<Channel> {
    return this.messagingCreationService.createChannel(user, dto);
  }

  @Post("join/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async joinChannel(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.messagingManagementService.joinChannel(id, user);
  }

  @Post("file-upload")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @UseInterceptors(CustomFileInterceptor)
  async uploadAvatar(@UploadedFile() file: IFile, @Query() dto: UploadFileToChannelDto): Promise<string> {
    return this.messagingManagementService.uploadFile(file, dto);
  }

  @Patch("resolve/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateChannelStatus(@Param() { id }: UUIDParamDto): Promise<void> {
    return this.messagingManagementService.resolveAppointmentChannel(id);
  }
}
