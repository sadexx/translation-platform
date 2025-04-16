import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  IAllTypeAppointmentOrders,
  IAllTypeAppointmentOrdersForWebsocket,
  IResultListInterpreters,
} from "src/modules/appointment-orders/common/interface";
import { FindOneOptions, Repository } from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { GetAllAppointmentOrdersDto, GetAllListInterpretersDto } from "src/modules/appointment-orders/common/dto";
import { AppointmentOrderQueryOptionsService } from "src/modules/appointment-orders-shared/services";
import { plainToInstance } from "class-transformer";
import {
  AppointmentOrderByIdOutput,
  AppointmentOrderGroupByIdOutout,
  AppointmentOrderGroupOutput,
  AppointmentOrderOutput,
  GetAllListInterpretersOutput,
} from "src/modules/appointment-orders/common/outputs";
import { findOneOrFail } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { INTERPRETER_ROLES } from "src/common/constants";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class AppointmentOrderQueryService {
  private lastChecked = new Date();
  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly helperService: HelperService,
  ) {}

  public async getCompanyAppointmentOrders(
    user: ITokenUserData,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrders> {
    const adminUserRole = await this.helperService.getUserRoleById(user.userRoleId);

    const individualQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("appointmentOrder");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrdersOptions(individualQueryBuilder, dto);

    const groupQueryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("appointmentOrderGroup");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrderGroupsOptions(groupQueryBuilder, dto);

    this.appointmentOrderQueryOptionsService.applyFiltersForCompanyAppointmentOrders(
      individualQueryBuilder,
      groupQueryBuilder,
      adminUserRole.operatedByCompanyId,
    );

    const individualAppointments = await individualQueryBuilder.getMany();
    const groupAppointments = await groupQueryBuilder.getMany();

    const individualOrderInstances = plainToInstance(AppointmentOrderOutput, individualAppointments);
    const groupOrderInstances = plainToInstance(AppointmentOrderGroupOutput, groupAppointments);

    return {
      appointmentOrders: individualOrderInstances,
      appointmentOrdersGroups: groupOrderInstances,
    };
  }

  public async getInterpreterMatchedAppointmentOrdersByRole(
    user: ITokenUserData,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrders> {
    if (INTERPRETER_ROLES.includes(user.role)) {
      return await this.getInterpreterMatchedAppointmentOrders(user.userRoleId, dto);
    } else {
      if (!dto.interpreterRoleId) {
        throw new BadRequestException("Interpreter role id is required for this query");
      }

      return await this.getInterpreterMatchedAppointmentOrders(dto.interpreterRoleId, dto);
    }
  }

  private async getInterpreterMatchedAppointmentOrders(
    userRoleId: string,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrders> {
    const individualQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("appointmentOrder");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrdersOptions(individualQueryBuilder, dto);

    const groupQueryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("appointmentOrderGroup");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrderGroupsOptions(groupQueryBuilder, dto);

    this.appointmentOrderQueryOptionsService.applyFiltersForMatchedAppointmentOrders(
      individualQueryBuilder,
      groupQueryBuilder,
      userRoleId,
    );

    const individualAppointments = await individualQueryBuilder.getMany();
    const groupAppointments = await groupQueryBuilder.getMany();

    const individualOrderInstances = plainToInstance(AppointmentOrderOutput, individualAppointments);
    const groupOrderInstances = plainToInstance(AppointmentOrderGroupOutput, groupAppointments);

    return {
      appointmentOrders: individualOrderInstances,
      appointmentOrdersGroups: groupOrderInstances,
    };
  }

  public async getInterpreterRejectedAppointmentOrdersByRole(
    user: ITokenUserData,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrders> {
    if (INTERPRETER_ROLES.includes(user.role)) {
      return await this.getInterpreterRejectedAppointmentOrders(user.userRoleId, dto);
    } else {
      if (!dto.interpreterRoleId) {
        throw new BadRequestException("Interpreter role id is required for this query");
      }

      return await this.getInterpreterRejectedAppointmentOrders(dto.interpreterRoleId, dto);
    }
  }

  private async getInterpreterRejectedAppointmentOrders(
    userRoleId: string,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrders> {
    const individualQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("appointmentOrder");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrdersOptions(individualQueryBuilder, dto);

    const groupQueryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("appointmentOrderGroup");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrderGroupsOptions(groupQueryBuilder, dto);

    this.appointmentOrderQueryOptionsService.applyFiltersForRejectedAppointmentOrders(
      individualQueryBuilder,
      groupQueryBuilder,
      userRoleId,
    );

    const individualAppointments = await individualQueryBuilder.getMany();
    const groupAppointments = await groupQueryBuilder.getMany();

    const individualOrderInstances = plainToInstance(AppointmentOrderOutput, individualAppointments);
    const groupOrderInstances = plainToInstance(AppointmentOrderGroupOutput, groupAppointments);

    return {
      appointmentOrders: individualOrderInstances,
      appointmentOrdersGroups: groupOrderInstances,
    };
  }

  public async getAppointmentOrderById(id: string, user: ITokenUserData): Promise<AppointmentOrderByIdOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderByIdOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const instance = plainToInstance(AppointmentOrderOutput, appointmentOrder);
    const isRejected = appointmentOrder.rejectedInterpreterIds.includes(user.userRoleId);

    return {
      ...instance,
      isRejected,
    };
  }

  public async getOrdersInGroupById(id: string, user: ITokenUserData): Promise<AppointmentOrderGroupByIdOutout> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getOrdersInGroupByIdOptions(id);
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    const instance = plainToInstance(AppointmentOrderGroupOutput, appointmentOrderGroup);
    const isRejected = appointmentOrderGroup.rejectedInterpreterIds.includes(user.userRoleId);

    return {
      ...instance,
      isRejected,
    };
  }

  public async getListOfInterpretersReceivedOrder(
    appointmentId: string,
    dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getListOfInterpretersReceivedOrderOptions(
      appointmentId,
      dto,
    );

    return this.fetchInterpretersFromQuery(
      this.appointmentOrderRepository,
      queryOptions,
      `List of ignored and declined interpreters not found for appointmentId: ${appointmentId}`,
      dto,
    );
  }

  public async getListOfInterpretersReceivedOrderGroup(
    appointmentGroupId: string,
    dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getListOfInterpretersReceivedOrderGroupOptions(
      appointmentGroupId,
      dto,
    );

    return this.fetchInterpretersFromQuery(
      this.appointmentOrderGroupRepository,
      queryOptions,
      `List of ignored and declined interpreters not found for appointmentGroupId: ${appointmentGroupId}`,
      dto,
    );
  }

  private async fetchInterpretersFromQuery(
    repository: Repository<AppointmentOrder | AppointmentOrderGroup>,
    queryOptions: { query: string; parameters: (string | number)[] },
    notFoundMessage: string,
    dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    const rawResult = (await repository.query(
      queryOptions.query,
      queryOptions.parameters,
    )) as IResultListInterpreters[];

    if (!rawResult || rawResult.length === 0) {
      throw new NotFoundException(notFoundMessage);
    }

    const [{ result }] = rawResult;
    const { data, total } = result;

    return {
      data: data ?? [],
      total: total,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getNewOrdersForWebSocket(): Promise<IAllTypeAppointmentOrdersForWebsocket> {
    const findOptionsIndividualAppointment = this.appointmentOrderQueryOptionsService.getNewOrderForWebSocketOptions(
      this.lastChecked,
    );
    const findOptionsGroupAppointment = this.appointmentOrderQueryOptionsService.getNewOrdersForWebSocketOptions(
      this.lastChecked,
    );
    const newAppointmentOrders = await this.getAllIndividualAppointmentOrders(findOptionsIndividualAppointment);
    const newAppointmentOrdersGroups = await this.getAllAppointmentOrderGroups(findOptionsGroupAppointment);

    this.lastChecked = new Date();

    return {
      appointmentOrders: newAppointmentOrders,
      appointmentOrdersGroups: newAppointmentOrdersGroups,
    };
  }

  private async getAllIndividualAppointmentOrders(
    findOneOptions: FindOneOptions<AppointmentOrder>,
  ): Promise<AppointmentOrder[]> {
    return await this.appointmentOrderRepository.find(findOneOptions);
  }

  private async getAllAppointmentOrderGroups(
    findOneOptions: FindOneOptions<AppointmentOrderGroup>,
  ): Promise<AppointmentOrderGroup[]> {
    return await this.appointmentOrderGroupRepository.find(findOneOptions);
  }
}
