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
import { MultiWayParticipantService } from "src/modules/multi-way-participant/services";
import { UpdateMultiWayParticipantDto } from "src/modules/multi-way-participant/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { UUIDParamDto } from "src/common/dto";
import { ICreateMultiWayParticipant } from "src/modules/multi-way-participant/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { NotEmptyBodyPipe } from "src/common/pipes";

@Controller("multi-way-participants")
export class MultiWayParticipantController {
  constructor(private readonly multiWayParticipantService: MultiWayParticipantService) {}

  @Post("appointment/add-participant/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async addParticipantToAppointment(
    @Param() { id }: UUIDParamDto,
    @Body() participant: ICreateMultiWayParticipant,
  ): Promise<MessageOutput> {
    return await this.multiWayParticipantService.addParticipantToAppointment(id, participant);
  }

  @Patch(":id")
  @UsePipes(NotEmptyBodyPipe)
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateParticipant(
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateMultiWayParticipantDto,
  ): Promise<MessageOutput> {
    return await this.multiWayParticipantService.updateParticipant(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteParticipant(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.multiWayParticipantService.deleteParticipant(id);
  }
}
