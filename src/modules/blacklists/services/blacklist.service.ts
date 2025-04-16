import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, In, IsNull, Not, Repository, UpdateResult } from "typeorm";
import { Blacklist } from "src/modules/blacklists/entities";
import { CreateBlacklistDto, UpdateBlacklistDto } from "src/modules/blacklists/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { Appointment } from "src/modules/appointments/entities";
import { findOneOrFail } from "src/common/utils";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { MessageOutput } from "src/common/outputs";
import { INTERPRETER_ROLES } from "src/common/constants";

@Injectable()
export class BlacklistService {
  private readonly MAX_BLACKLISTS: number = 2;

  constructor(
    @InjectRepository(Blacklist)
    private readonly blacklistRepository: Repository<Blacklist>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  public async checkAndCreateBlacklist(
    appointmentId: string,
    _dto: CreateBlacklistDto,
    user: ITokenUserData,
  ): Promise<MessageOutput | void> {
    const queryOptions: FindOneOptions<Appointment> = {
      select: {
        id: true,
        platformId: true,
        status: true,
        client: {
          id: true,
        },
        interpreter: {
          id: true,
        },
        blacklists: {
          id: true,
          blockedByUserRoleId: true,
        },
      },
      where: {
        id: appointmentId,
        status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
        client: Not(IsNull()),
        interpreter: Not(IsNull()),
      },
      relations: {
        client: true,
        interpreter: true,
        blacklists: true,
      },
    };

    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, queryOptions);
    const blacklists = appointment.blacklists || [];

    if (blacklists.length === this.MAX_BLACKLISTS) {
      throw new BadRequestException("You have already created a blacklist for this appointment");
    }

    if (blacklists.length === 1) {
      const existingBlacklist = blacklists[0];

      if (existingBlacklist.blockedByUserRoleId === user.userRoleId) {
        throw new BadRequestException("You have already created a blacklist for this appointment");
      }
    }

    return await this.constructAndCreateBlacklist(appointment, user);
  }

  private async constructAndCreateBlacklist(appointment: Appointment, user: ITokenUserData): Promise<MessageOutput> {
    const blacklist = await this.constructBlacklist(appointment, user);

    return await this.createBlacklist(blacklist);
  }

  private async createBlacklist(blacklist: Partial<Blacklist>): Promise<MessageOutput> {
    const newBlacklist = this.blacklistRepository.create(blacklist);
    await this.blacklistRepository.save(newBlacklist);

    return { message: "Blacklist created successfully" };
  }

  private async constructBlacklist(appointment: Appointment, user: ITokenUserData): Promise<Partial<Blacklist>> {
    if (!appointment.client || !appointment.interpreter) {
      throw new BadRequestException("Cannot create a blacklist if client or interpreter does not exist.");
    }

    let blockedByUserRole = appointment.client;
    let blockedUserRole = appointment.interpreter;

    if (INTERPRETER_ROLES.includes(user.role)) {
      blockedByUserRole = appointment.interpreter;
      blockedUserRole = appointment.client;
    }

    return {
      appointment: appointment,
      blockedByUserRole: blockedByUserRole,
      blockedUserRole: blockedUserRole,
    };
  }

  public async updateBlacklist(appointmentId: string, dto: UpdateBlacklistDto): Promise<MessageOutput> {
    const result: UpdateResult = await this.blacklistRepository.update(
      { appointment: { id: appointmentId } },
      { isActive: dto.isActive },
    );

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException("Not found any blacklist for this appointment");
    }

    return { message: "Blacklist updated successfully" };
  }

  public async deleteBlacklist(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions: FindOneOptions<Blacklist> = {
      select: { id: true },
      where: { id: id, blockedByUserRoleId: user.userRoleId },
    };
    const blacklist = await findOneOrFail(id, this.blacklistRepository, queryOptions);

    await this.blacklistRepository.remove(blacklist);
  }
}
