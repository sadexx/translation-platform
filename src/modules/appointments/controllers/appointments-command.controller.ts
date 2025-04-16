import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { PlatformIdParamDto, UUIDParamDto } from "src/common/dto";
import {
  CancelAppointmentDto,
  CreateFaceToFaceAppointmentDto,
  CreateVirtualAppointmentDto,
  EndAppointmentDto,
  RateAppointmentByClientDto,
  RateAppointmentByInterpreterDto,
  UpdateAppointmentDto,
  UpdateAppointmentSearchConditionsDto,
} from "src/modules/appointments/common/dto";
import {
  AppointmentCancelService,
  AppointmentCommandService,
  AppointmentCreateService,
  AppointmentEndService,
  AppointmentRatingService,
  AppointmentUpdateService,
} from "src/modules/appointments/services";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ICreateAppointmentOutput } from "src/modules/appointments/common/outputs";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("appointments/commands")
export class AppointmentsCommandController {
  constructor(
    private readonly appointmentsCommandService: AppointmentCommandService,
    private readonly appointmentCreateService: AppointmentCreateService,
    private readonly appointmentUpdateService: AppointmentUpdateService,
    private readonly appointmentCancelService: AppointmentCancelService,
    private readonly appointmentRatingService: AppointmentRatingService,
    private readonly appointmentEndService: AppointmentEndService,
  ) {}

  @Post("/virtual")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createVirtualAppointment(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: CreateVirtualAppointmentDto,
  ): Promise<ICreateAppointmentOutput> {
    return await this.appointmentCreateService.checkConflictsAndCreateVirtualAppointment(user, dto);
  }

  @Post("/face-to-face")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createFaceToFaceAppointment(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: CreateFaceToFaceAppointmentDto,
  ): Promise<ICreateAppointmentOutput> {
    return await this.appointmentCreateService.checkConflictsAndCreateFaceToFaceAppointment(user, dto);
  }

  @Patch(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  async updateAppointment(
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentUpdateService.updateAppointment(id, dto, user);
  }

  @Patch("/search-conditions/:id")
  @UsePipes(NotEmptyBodyPipe)
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateSearchConditions(
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateAppointmentSearchConditionsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentUpdateService.updateAppointmentSearchConditions(id, dto, user);
  }

  @Patch("/business-time/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateAppointmentBusinessTime(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<MessageOutput> {
    return await this.appointmentUpdateService.handleUpdateAppointmentBusinessTime(id, user);
  }

  @Delete(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.appointmentsCommandService.deleteAppointment(id, user);
  }

  @Patch("archive/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async archiveAppointment(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<MessageOutput> {
    return await this.appointmentsCommandService.archiveAppointment(id, user);
  }

  @Post("late-notification/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendLateNotification(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.appointmentsCommandService.sendLateNotification(id, user);
  }

  @Patch("external-interpreter-found/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async confirmExternalInterpreterFound(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.appointmentsCommandService.confirmExternalInterpreterFound(id);
  }

  @Patch("cancel/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async cancelAppointment(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
    @Body() dto: CancelAppointmentDto,
  ): Promise<MessageOutput> {
    return await this.appointmentCancelService.cancelAppointment(id, user, dto);
  }

  @Patch("cancel/group/:platformId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async cancelGroupAppointments(
    @Param() { platformId }: PlatformIdParamDto,
    @CurrentUser() user: ITokenUserData,
    @Body() dto: CancelAppointmentDto,
  ): Promise<MessageOutput> {
    return await this.appointmentCancelService.cancelGroupAppointments(platformId, user, dto);
  }

  @Patch("rate-by-client/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async rateAppointmentByClient(@Param() { id }: UUIDParamDto, @Body() dto: RateAppointmentByClientDto): Promise<void> {
    return await this.appointmentRatingService.rateAppointmentByClient(id, dto);
  }

  @Patch("rate-by-interpreter/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async rateAppointmentByInterpreter(
    @Param() { id }: UUIDParamDto,
    @Body() dto: RateAppointmentByInterpreterDto,
  ): Promise<void> {
    return await this.appointmentRatingService.rateAppointmentByInterpreter(id, dto);
  }

  @Patch("rate/interpreter/exclude-toggle/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async toggleInterpreterRatingExclusion(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.appointmentRatingService.toggleInterpreterRatingExclusion(id);
  }

  @Patch("end/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async endCompletedAppointment(
    @Param() { id }: UUIDParamDto,
    @Body() dto: EndAppointmentDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.appointmentEndService.endCompletedAppointment(id, dto, user);
  }
}
