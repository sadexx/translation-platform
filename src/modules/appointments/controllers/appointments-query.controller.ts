import { Controller, Get, Param, Query, SerializeOptions, UseGuards, UsePipes } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { PlatformIdParamDto, UUIDParamDto } from "src/common/dto";
import { AppointmentOutput, GetAllAppointmentsOutput } from "src/modules/appointments/common/outputs";
import { Appointment } from "src/modules/appointments/entities";
import { AppointmentQueryService } from "src/modules/appointments/services";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { GetAllAppointmentsDto } from "src/modules/appointments/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("appointments/query")
export class AppointmentsQueryController {
  constructor(private readonly appointmentQueryService: AppointmentQueryService) {}

  @Get("/my-list")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @SerializeOptions({
    strategy: "exposeAll",
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.IND_CLIENT,
      EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
    ],
    type: AppointmentOutput,
  })
  async getAll(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentsDto,
  ): Promise<GetAllAppointmentsOutput> {
    return await this.appointmentQueryService.getAllAppointments(user, dto);
  }

  @Get("/archived")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @SerializeOptions({
    strategy: "exposeAll",
    groups: [
      EUserRoleName.IND_CLIENT,
      EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
      EUserRoleName.CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
    ],
    type: AppointmentOutput,
  })
  async getArchived(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentsDto,
  ): Promise<GetAllAppointmentsOutput> {
    return await this.appointmentQueryService.getArchivedAppointments(user, dto);
  }

  @Get("/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getOne(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<Appointment> {
    return await this.appointmentQueryService.getAppointmentById(id, user);
  }

  @Get("/group/ids")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAllAppointmentGroupIds(@CurrentUser() user: ITokenUserData): Promise<string[]> {
    return await this.appointmentQueryService.getAppointmentsGroupIds(user);
  }

  @Get("/group/:platformId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @SerializeOptions({
    strategy: "exposeAll",
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.IND_CLIENT,
      EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
    ],
    type: AppointmentOutput,
  })
  async getAppointmentsByGroupId(
    @Param() { platformId }: PlatformIdParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<Appointment[]> {
    return await this.appointmentQueryService.getAppointmentsByGroupId(platformId, user);
  }
}
