import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { FindOneOptions, Repository } from "typeorm";
import {
  SearchEngineOnDemandService,
  SearchEnginePreBookGroupService,
  SearchEnginePreBookOrderService,
  SearchEngineStepService,
} from "src/modules/search-engine-logic/services";
import { EAppointmentInterpretingType, EAppointmentSchedulingType } from "src/modules/appointments/common/enums";
import { IGroupSearchContext, ISearchContextBase } from "src/modules/search-engine-logic/common/interface";
import { addMinutes } from "date-fns";
import { NUMBER_OF_MINUTES_IN_HALF_HOUR } from "src/common/constants";
import { findOneOrFail, findOneOrFailQueryBuilder } from "src/common/utils";
import { ESortOrder } from "src/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class SearchEngineLogicService {
  private readonly lokiLogger = new LokiLogger(SearchEngineLogicService.name);

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    private readonly searchEngineOnDemandService: SearchEngineOnDemandService,
    private readonly searchEnginePreBookGroupService: SearchEnginePreBookGroupService,
    private readonly searchEnginePreBookOrderService: SearchEnginePreBookOrderService,
    private readonly searchEngineStepService: SearchEngineStepService,
  ) {}

  public async launchSearchForIndividualOrder(id: string): Promise<void> {
    const queryOptions: FindOneOptions<AppointmentOrder> = {
      select: {
        appointment: {
          id: true,
          platformId: true,
          clientId: true,
          appointmentAdminInfo: {
            id: true,
          },
        },
      },
      where: { id: id, appointmentOrderGroup: false },
      relations: { appointment: { appointmentAdminInfo: true } },
    };
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    if (appointmentOrder.interpretingType === EAppointmentInterpretingType.ESCORT) {
      this.lokiLogger.error(`Search engine not applicable for escort interpreting type. Order Id: ${id}`);

      return;
    }

    if (
      appointmentOrder.isFirstSearchCompleted === null ||
      appointmentOrder.isSecondSearchCompleted === null ||
      appointmentOrder.isSearchNeeded === null ||
      appointmentOrder.isCompanyHasInterpreters === null
    ) {
      this.lokiLogger.error(`Failed to start search. Order with Id: ${id} has null flags.`);
      throw new BadRequestException(`Failed to start search. Flags are not set.`);
    }

    const query = this.searchEngineStepService.initializeQuery();
    const context: ISearchContextBase = {
      query: query,
      order: appointmentOrder,
      orderType: appointmentOrder.schedulingType,
      sendNotifications: true,
      setRedFlags: true,
      isFirstSearchCompleted: appointmentOrder.isFirstSearchCompleted,
      isSecondSearchCompleted: appointmentOrder.isSecondSearchCompleted,
      isSearchNeeded: appointmentOrder.isSearchNeeded,
      isCompanyHasInterpreters: appointmentOrder.isCompanyHasInterpreters,
      timeToRestart: null,
      isOrderSaved: false,
    };

    try {
      if (context.orderType === EAppointmentSchedulingType.ON_DEMAND) {
        await this.searchEngineOnDemandService.startSearchEngineOnDemand(context);
      } else {
        await this.searchEnginePreBookOrderService.startSearchEngineForOrder(context);
      }
    } finally {
      if (!context.isOrderSaved) {
        await this.appointmentOrderRepository.update(
          { id: appointmentOrder.id },
          {
            isFirstSearchCompleted: context.isFirstSearchCompleted,
            isSecondSearchCompleted: context.isSecondSearchCompleted,
            isSearchNeeded: context.isSearchNeeded,
            timeToRestart: context.timeToRestart,
          },
        );
      }
    }
  }

  public async launchSearchForOrderGroup(id: string): Promise<void> {
    const subQuery = this.appointmentOrderGroupRepository
      .createQueryBuilder("group")
      .innerJoin("group.appointmentOrders", "order")
      .where("group.id = :id", { id })
      .andWhere("order.isOrderGroup = true")
      .orderBy("order.scheduledStartTime", ESortOrder.ASC)
      .limit(1)
      .select("order.id");

    const queryBuilder = this.appointmentOrderGroupRepository
      .createQueryBuilder("group")
      .leftJoinAndSelect("group.appointmentOrders", "order", "order.id = (" + subQuery.getQuery() + ")")
      .leftJoin("order.appointment", "appointment")
      .leftJoin("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .addSelect(["appointment.id", "appointment.platformId", "appointment.clientId", "appointmentAdminInfo.id"])
      .setParameters(subQuery.getParameters())
      .where("group.id = :id", { id });

    const appointmentOrderGroup = await findOneOrFailQueryBuilder(id, queryBuilder, "AppointmentOrderGroup");

    if (appointmentOrderGroup.appointmentOrders.length === 0) {
      this.lokiLogger.error(
        `Failed to start search. Appointment orders not found in the AppointmentOrderGroup with Id: ${id}`,
      );
      throw new BadRequestException("Failed to start search. Appointment orders not found.");
    }

    const firstClosestOrder = appointmentOrderGroup.appointmentOrders[0];

    if (firstClosestOrder.interpretingType === EAppointmentInterpretingType.ESCORT) {
      this.lokiLogger.error(`Search engine not applicable for escort interpreting type. Order Group Id: ${id}`);

      return;
    }

    const query = this.searchEngineStepService.initializeQuery();
    const context: IGroupSearchContext = {
      query: query,
      order: firstClosestOrder,
      group: appointmentOrderGroup,
      orderType: firstClosestOrder.schedulingType,
      sendNotifications: true,
      setRedFlags: true,
      isFirstSearchCompleted: appointmentOrderGroup.isFirstSearchCompleted,
      isSecondSearchCompleted: appointmentOrderGroup.isSecondSearchCompleted,
      isSearchNeeded: appointmentOrderGroup.isSearchNeeded,
      isCompanyHasInterpreters: appointmentOrderGroup.isCompanyHasInterpreters,
      timeToRestart: addMinutes(new Date(), NUMBER_OF_MINUTES_IN_HALF_HOUR),
      isOrderSaved: false,
    };

    try {
      await this.searchEnginePreBookGroupService.startSearchEngineForGroup(context);
    } finally {
      if (!context.isOrderSaved) {
        await this.appointmentOrderGroupRepository.update(
          { id: appointmentOrderGroup.id },
          {
            isFirstSearchCompleted: context.isFirstSearchCompleted,
            isSecondSearchCompleted: context.isSecondSearchCompleted,
            isSearchNeeded: context.isSearchNeeded,
            timeToRestart: context.timeToRestart,
          },
        );
      }
    }
  }
}
