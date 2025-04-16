import { Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AppointmentOrderCommandService } from "src/modules/appointment-orders/services";
import { CurrentUser } from "src/common/decorators";
import { PlatformIdParamDto, UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  AcceptAppointmentDto,
  AddInterpreterToOrderDto,
  SendRepeatNotificationDto,
} from "src/modules/appointment-orders/common/dto";
import { IJoinMeeting } from "src/modules/chime-meeting-configuration/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("appointment-orders/command")
export class AppointmentOrdersCommandController {
  constructor(private readonly appointmentOrderCommandService: AppointmentOrderCommandService) {}

  @Post("/accept/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async acceptAppointmentOrder(
    @Param() { id }: UUIDParamDto,
    @Query() dto: AcceptAppointmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.acceptAppointmentOrder(id, user, dto);
  }

  @Post("/accept/on-demand/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async acceptAppointmentOnDemandOrder(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IJoinMeeting> {
    return await this.appointmentOrderCommandService.acceptAppointmentOnDemandOrder(id, user);
  }

  @Post("/group/accept/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async acceptAppointmentOrderGroup(
    @Param() { id }: UUIDParamDto,
    @Query() dto: AcceptAppointmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.acceptAppointmentOrderGroup(id, user, dto);
  }

  @Patch("/reject/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async rejectAppointmentOrder(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.rejectAppointmentOrder(id, user);
  }

  @Patch("/group/reject/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async rejectAppointmentOrderGroup(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.rejectAppointmentOrderGroup(id, user);
  }

  @Delete("/refuse/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async refuseAppointmentOrder(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.appointmentOrderCommandService.refuseAppointmentOrder(id, user);
  }

  @Delete("/group/refuse/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async refuseAppointmentOrderGroup(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.appointmentOrderCommandService.refuseAppointmentOrderGroup(id, user);
  }

  @Post("/send-repeat-notification-to-interpreters/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async sendRepeatNotificationToInterpreters(
    @Param() { id }: UUIDParamDto,
    @Query() dto: SendRepeatNotificationDto,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.sendRepeatNotificationToInterpreters(id, dto);
  }

  @Post("/group/send-repeat-notification-to-interpreters/:platformId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async sendRepeatNotificationToInterpretersGroup(
    @Param() { platformId }: PlatformIdParamDto,
    @Query() dto: SendRepeatNotificationDto,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.sendRepeatNotificationToInterpretersGroup(platformId, dto);
  }

  @Post("/add-interpreter-to-order/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async manualAddInterpreterToOrder(
    @Param() { id }: UUIDParamDto,
    @Query() dto: AddInterpreterToOrderDto,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.addInterpreterToOrder(id, dto);
  }

  @Post("/group/add-interpreter-to-order-group/:platformId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async manualAddInterpreterToOrderGroup(
    @Param() { platformId }: PlatformIdParamDto,
    @Query() dto: AddInterpreterToOrderDto,
  ): Promise<MessageOutput> {
    return await this.appointmentOrderCommandService.addInterpreterToOrderGroup(platformId, dto);
  }
}
