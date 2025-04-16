import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/entities";
import { Repository } from "typeorm";
import {
  ADMIN_ROLES,
  CLIENT_ROLES,
  DEFAULT_EMPTY_VALUE,
  INTERPRETER_AND_CLIENT_ROLES,
  INTERPRETER_ROLES,
} from "src/common/constants";
import { GetAllAppointmentsDto } from "src/modules/appointments/common/dto";
import { GetAllAppointmentsOutput } from "src/modules/appointments/common/outputs/get-all-appointments.output";
import { AppointmentOutput } from "src/modules/appointments/common/outputs";
import { plainToInstance } from "class-transformer";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";
import { findOneOrFail, findOneOrFailQueryBuilder } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class AppointmentQueryService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly appointmentQueryOptions: AppointmentQueryOptionsService,
    private readonly helperService: HelperService,
  ) {}

  public async getAllAppointments(user: ITokenUserData, dto: GetAllAppointmentsDto): Promise<GetAllAppointmentsOutput> {
    let appointments: Appointment[] = [];
    let count: number = 0;
    let instances: AppointmentOutput[] = [];

    if (CLIENT_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForClient(user, DEFAULT_EMPTY_VALUE, DEFAULT_EMPTY_VALUE, dto);
      instances = plainToInstance(AppointmentOutput, appointments, {
        groups: CLIENT_ROLES,
      });
    }

    if (INTERPRETER_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForInterpreter(
        user,
        DEFAULT_EMPTY_VALUE,
        DEFAULT_EMPTY_VALUE,
        dto,
      );
      instances = plainToInstance(AppointmentOutput, appointments, {
        groups: INTERPRETER_ROLES,
      });
    }

    if (ADMIN_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForAdmin(user, DEFAULT_EMPTY_VALUE, DEFAULT_EMPTY_VALUE, dto);
      instances = plainToInstance(AppointmentOutput, appointments, {
        groups: ADMIN_ROLES,
      });
    }

    return {
      data: instances,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  private async getAppointmentsForClient(
    user: ITokenUserData,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): Promise<[Appointment[], number]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptions.getAllAppointmentsForClientOptions(
      queryBuilder,
      user,
      appointmentsGroupId,
      archived,
      dto,
    );

    const [appointments, count] = await queryBuilder.getManyAndCount();

    return [appointments, count];
  }

  private async getAppointmentsForInterpreter(
    user: ITokenUserData,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): Promise<[Appointment[], number]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptions.getAllAppointmentsForInterpreterOptions(
      queryBuilder,
      user,
      appointmentsGroupId,
      archived,
      dto,
    );

    const [appointments, count] = await queryBuilder.getManyAndCount();

    return [appointments, count];
  }

  private async getAppointmentsForAdmin(
    user: ITokenUserData,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): Promise<[Appointment[], number]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    const adminUserRole = await this.helperService.getUserRoleById(user.userRoleId, { role: true });
    this.appointmentQueryOptions.getAllAppointmentsForAdminOptions(
      queryBuilder,
      adminUserRole,
      appointmentsGroupId,
      archived,
      dto,
    );

    const [appointments, count] = await queryBuilder.getManyAndCount();

    return [appointments, count];
  }

  public async getArchivedAppointments(
    user: ITokenUserData,
    dto: GetAllAppointmentsDto,
  ): Promise<GetAllAppointmentsOutput> {
    let appointments: Appointment[] = [];
    let count: number = 0;
    const archived = true;

    if (CLIENT_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForClient(user, DEFAULT_EMPTY_VALUE, archived, dto);
    }

    if (INTERPRETER_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForInterpreter(user, DEFAULT_EMPTY_VALUE, archived, dto);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForAdmin(user, DEFAULT_EMPTY_VALUE, archived, dto);
    }

    const instances: AppointmentOutput[] = plainToInstance(AppointmentOutput, appointments, {
      groups: ADMIN_ROLES,
    });

    return {
      data: instances,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getAppointmentById(id: string, user: ITokenUserData): Promise<Appointment> {
    if (INTERPRETER_AND_CLIENT_ROLES.includes(user.role)) {
      return await this.getAppointmentForClientOrInterpreter(id, user);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      return await this.getAppointmentForAdmin(id);
    }

    throw new ForbiddenException("Invalid user role");
  }

  private async getAppointmentForClientOrInterpreter(id: string, user: ITokenUserData): Promise<Appointment> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptions.getAppointmentForClientOrInterpreterOptions(queryBuilder, id, user);
    const appointment = await findOneOrFailQueryBuilder(id, queryBuilder, "Appointment");

    return appointment;
  }

  private async getAppointmentForAdmin(id: string): Promise<Appointment> {
    const queryOptions = this.appointmentQueryOptions.getAppointmentForAdminOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    return appointment;
  }

  public async getAppointmentsGroupIds(user: ITokenUserData): Promise<string[]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptions.getAppointmentsGroupIdsOptions(queryBuilder, user);

    const groupIds: { appointmentsGroupId: string }[] = await queryBuilder.getRawMany();

    return groupIds.map((item) => item.appointmentsGroupId);
  }

  public async getAppointmentsByGroupId(appointmentsGroupId: string, user: ITokenUserData): Promise<Appointment[]> {
    if (CLIENT_ROLES.includes(user.role)) {
      const [appointments] = await this.getAppointmentsForClient(user, appointmentsGroupId);

      return appointments;
    }

    if (INTERPRETER_ROLES.includes(user.role)) {
      const [appointments] = await this.getAppointmentsForInterpreter(user, appointmentsGroupId);

      return appointments;
    }

    if (ADMIN_ROLES.includes(user.role)) {
      const [appointments] = await this.getAppointmentsForAdmin(user, appointmentsGroupId);

      return appointments;
    }

    throw new ForbiddenException("Invalid user role");
  }
}
