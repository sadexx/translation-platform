import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { DraftAppointmentService } from "src/modules/draft-appointments/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { CreateDraftAppointmentsDto, GetAllDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { UUIDParamDto } from "src/common/dto";
import { MessageOutput } from "src/common/outputs";
import { DraftAppointmentOutput, GetAllDraftAppointmentsOutput } from "src/modules/draft-appointments/common/outputs";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("draft-appointments")
export class DraftAppointmentsController {
  constructor(private readonly draftAppointmentService: DraftAppointmentService) {}

  @Get()
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @SerializeOptions({
    strategy: "exposeAll",
    type: DraftAppointmentOutput,
  })
  async getAll(@Query() dto: GetAllDraftAppointmentsDto): Promise<GetAllDraftAppointmentsOutput> {
    return await this.draftAppointmentService.getAllDraftAppointmentsForAdmin(dto);
  }

  @Get("/client")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAllForClient(@CurrentUser() user: ITokenUserData): Promise<DraftAppointment[]> {
    return await this.draftAppointmentService.getAllDraftAppointmentsForClient(user);
  }

  @Get(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getById(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<DraftAppointment> {
    return await this.draftAppointmentService.getDraftAppointmentById(id, user);
  }

  @Post()
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createVirtualAppointment(@Body() dto: CreateDraftAppointmentsDto): Promise<MessageOutput> {
    return await this.draftAppointmentService.createFullDraftAppointment(dto);
  }

  @Delete(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async delete(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<MessageOutput> {
    return await this.draftAppointmentService.deleteDraftAppointment(id, user);
  }
}
