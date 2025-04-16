import { Injectable } from "@nestjs/common";
import {
  ArrayContains,
  Brackets,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsSelect,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Not,
  SelectQueryBuilder,
} from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { GetAllAppointmentOrdersDto, GetAllListInterpretersDto } from "src/modules/appointment-orders/common/dto";
import { generateCaseForEnumOrder } from "src/common/utils";
import {
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentSchedulingTypeOrder,
  appointmentTopicOrder,
  EAppointmentInterpretingType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { languageOrder } from "src/modules/interpreter-profile/common/enum";
import { UserRole } from "src/modules/users-roles/entities";
import { ESortOrder } from "src/common/enums";
import { Appointment } from "src/modules/appointments/entities";

@Injectable()
export class AppointmentOrderQueryOptionsService {
  constructor() {}
  /**
   ** AppointmentOrderCommandService
   */

  public getFirstScheduledAppointmentOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      where: { isOrderGroup: true, appointmentOrderGroupId: id },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  public getInterpreterOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      where: { id: userRoleId },
      relations: {
        interpreterProfile: true,
        role: true,
        profile: true,
        user: true,
      },
    };
  }

  public getAppointmentOrderOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        platformId: true,
        schedulingType: true,
        matchedInterpreterIds: true,
        appointment: {
          id: true,
          platformId: true,
          clientId: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          communicationType: true,
          alternativePlatform: true,
          appointmentsGroupId: true,
          channelId: true,
          client: {
            id: true,
            instanceUserArn: true,
            role: {
              name: true,
            },
            profile: {
              firstName: true,
            },
          },
          appointmentAdminInfo: {
            id: true,
            isRedFlagEnabled: true,
          },
        },
        appointmentOrderGroup: {
          id: true,
          sameInterpreter: true,
        },
      },
      where: { id: id },
      relations: {
        appointment: {
          client: {
            role: true,
            profile: true,
            user: true,
          },
          appointmentAdminInfo: true,
        },
        appointmentOrderGroup: true,
      },
    };
  }

  public getAppointmentOrderGroupOptions(id: string): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        appointmentOrders: {
          id: true,
          schedulingType: true,
          appointment: {
            id: true,
            platformId: true,
            clientId: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
            communicationType: true,
            alternativePlatform: true,
            appointmentsGroupId: true,
            channelId: true,
            client: {
              id: true,
              instanceUserArn: true,
              role: {
                name: true,
              },
              profile: {
                firstName: true,
              },
            },
            appointmentAdminInfo: {
              id: true,
              isRedFlagEnabled: true,
            },
          },
        },
      },
      where: { id: id },
      relations: {
        appointmentOrders: {
          appointment: {
            client: {
              role: true,
              profile: true,
              user: true,
            },
            appointmentAdminInfo: true,
          },
        },
      },
    };
  }

  public getDeleteAppointmentOrderGroupOptions(id: string, isPlatform: boolean): FindOneOptions<AppointmentOrderGroup> {
    return {
      where: isPlatform ? { platformId: id } : { id: id },
      relations: {
        appointmentOrders: true,
      },
    };
  }

  public getRejectAppointmentOrderOptions(id: string, interpreterId: string): FindOneOptions<AppointmentOrder> {
    return {
      where: { id, matchedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getRejectAppointmentOrderGroupOptions(
    id: string,
    interpreterId: string,
  ): FindOneOptions<AppointmentOrderGroup> {
    return {
      where: { id, matchedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getRefuseAppointmentOrderOptions(id: string, interpreterId: string): FindOneOptions<AppointmentOrder> {
    return {
      where: { id, rejectedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getRefuseAppointmentOrderGroupOptions(
    id: string,
    interpreterId: string,
  ): FindOneOptions<AppointmentOrderGroup> {
    return {
      where: { id, rejectedInterpreterIds: ArrayContains([interpreterId]) },
    };
  }

  public getSharedOrderForRepeatAndAddInterpreterOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        platformId: true,
        matchedInterpreterIds: true,
        schedulingType: true,
      },
      where: {
        appointment: { id: id },
        isOrderGroup: false,
      },
    };
  }

  public getSharedOrderGroupForRepeatAndAddInterpreterOptions(
    platformId: string,
  ): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        matchedInterpreterIds: true,
      },
      where: {
        platformId: platformId,
      },
    };
  }

  public getAddInterpreterToOrderOptions(id: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
      },
      where: {
        id: id,
      },
    };
  }

  /**
   ** AppointmentOrderExpirationCancelService
   */
  public getCancelAppointmentBySystemOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        clientId: true,
        schedulingType: true,
        communicationType: true,
        isGroupAppointment: true,
        alternativePlatform: true,
        platformId: true,
        appointmentReminder: {
          id: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          chimeMeetingId: true,
          appointmentId: true,
          attendees: {
            id: true,
          },
        },
      },
      where: { id: id, isGroupAppointment: false },
      relations: {
        appointmentReminder: true,
        appointmentAdminInfo: true,
        chimeMeetingConfiguration: { attendees: true },
      },
    };
  }

  public getCancelAppointmentOrderGroup(platformId: string): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        clientId: true,
        interpreterId: true,
        communicationType: true,
        appointmentsGroupId: true,
        isGroupAppointment: true,
        alternativePlatform: true,
        platformId: true,
        appointmentReminder: {
          id: true,
        },
        appointmentAdminInfo: {
          id: true,
          isRedFlagEnabled: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          attendees: {
            id: true,
          },
        },
        appointmentOrder: {
          id: true,
        },
      },
      where: { appointmentsGroupId: platformId, isGroupAppointment: true },
      relations: {
        appointmentReminder: true,
        appointmentAdminInfo: true,
        chimeMeetingConfiguration: { attendees: true },
        appointmentOrder: true,
      },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
    };
  }

  /**
   ** AppointmentOrderQueryService
   */

  public getAllAppointmentOrdersOptions(
    queryBuilder: SelectQueryBuilder<AppointmentOrder>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    queryBuilder
      .leftJoin("appointmentOrder.appointment", "appointment")
      .addSelect(["appointment.id", "appointment.sameInterpreter"])
      .leftJoinAndSelect("appointment.address", "address")
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.lastName", "clientProfile.gender"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.platformId", "clientUser.avatarUrl"])
      .andWhere("appointmentOrder.isOrderGroup = :isOrderGroup", { isOrderGroup: false });

    this.applyFilters(queryBuilder, dto);
    this.applyOrderingForAppointmentOrder(queryBuilder, dto);
  }

  public getAllAppointmentOrderGroupsOptions(
    queryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    queryBuilder
      .leftJoin("appointmentOrderGroup.appointmentOrders", "appointmentOrder")
      .addSelect([
        "appointmentOrder.id",
        "appointmentOrder.platformId",
        "appointmentOrder.appointmentOrderGroupId",
        "appointmentOrder.isOrderGroup",
        "appointmentOrder.scheduledStartTime",
        "appointmentOrder.scheduledEndTime",
        "appointmentOrder.communicationType",
        "appointmentOrder.schedulingType",
        "appointmentOrder.schedulingDurationMin",
        "appointmentOrder.topic",
        "appointmentOrder.interpreterType",
        "appointmentOrder.interpretingType",
        "appointmentOrder.languageFrom",
        "appointmentOrder.languageTo",
        "appointmentOrder.approximateCost",
        "appointmentOrder.clientPlatformId",
        "appointmentOrder.clientFirstName",
        "appointmentOrder.clientLastName",
        "appointmentOrder.participantType",
        "appointmentOrder.operatedByCompanyName",
      ])
      .leftJoin("appointmentOrder.appointment", "appointment")
      .addSelect(["appointment.id", "appointment.sameInterpreter"])
      .leftJoinAndSelect("appointment.address", "address")
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.lastName", "clientProfile.gender"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.platformId", "clientUser.avatarUrl"])
      .andWhere("appointmentOrder.isOrderGroup = :isOrderGroup", { isOrderGroup: true });

    this.applyFilters(queryBuilder, dto);
    this.applyOrderingForAppointmentOrderGroup(queryBuilder, dto);
  }

  public applyFiltersForCompanyAppointmentOrders(
    individualQueryBuilder: SelectQueryBuilder<AppointmentOrder>,
    groupQueryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    operatedByCompanyId: string,
  ): void {
    const INDIVIDUAL_ORDERS_LIMIT = 250;
    const GROUP_ORDERS_LIMIT = 50;

    individualQueryBuilder
      .andWhere("appointmentOrder.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId,
      })
      .take(INDIVIDUAL_ORDERS_LIMIT);
    groupQueryBuilder
      .andWhere("appointmentOrderGroup.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId,
      })
      .take(GROUP_ORDERS_LIMIT);
  }

  public applyFiltersForMatchedAppointmentOrders(
    individualQueryBuilder: SelectQueryBuilder<AppointmentOrder>,
    groupQueryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    userRoleId: string,
  ): void {
    individualQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.matchedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.rejectedInterpreterIds)", { userRoleId });
    groupQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.matchedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.rejectedInterpreterIds)", { userRoleId });
  }

  public applyFiltersForRejectedAppointmentOrders(
    individualQueryBuilder: SelectQueryBuilder<AppointmentOrder>,
    groupQueryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    userRoleId: string,
  ): void {
    individualQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.rejectedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrder.matchedInterpreterIds)", { userRoleId });
    groupQueryBuilder
      .andWhere("ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.rejectedInterpreterIds", { userRoleId })
      .andWhere("NOT (ARRAY[:userRoleId]::uuid[] <@ appointmentOrderGroup.matchedInterpreterIds)", { userRoleId });
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AppointmentOrder | AppointmentOrderGroup>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("appointmentOrder.schedulingType IN (:...schedulingTypes)", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("appointmentOrder.interpretingType IN (:...interpretingTypes)", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("appointmentOrder.topic IN (:...topics)", { topics: dto.topics });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("appointmentOrder.communicationType IN (:...communicationTypes)", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("appointmentOrder.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("appointmentOrder.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.schedulingDurationMin) {
      queryBuilder.andWhere("appointmentOrder.schedulingDurationMin = :schedulingDurationMin", {
        schedulingDurationMin: dto.schedulingDurationMin,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("appointmentOrder.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    } else if (dto.startDate) {
      queryBuilder.andWhere("appointmentOrder.scheduledStartTime >= :startDate", { startDate: dto.startDate });
    } else if (dto.endDate) {
      queryBuilder.andWhere("appointmentOrder.scheduledStartTime <= :endDate", { endDate: dto.endDate });
    }
  }

  private applySearch(
    queryBuilder: SelectQueryBuilder<AppointmentOrder | AppointmentOrderGroup>,
    searchField: string,
  ): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointmentOrder.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointmentOrder.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointmentOrder.languageFrom, ' - ', appointmentOrder.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.streetName ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(clientProfile.firstName, ' ', clientProfile.lastName) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("clientUser.platformId ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrderingForAppointmentOrder(
    queryBuilder: SelectQueryBuilder<AppointmentOrder>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.schedulingType",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.communicationType",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.interpretingType",
        appointmentInterpretingTypeOrder,
      );

      queryBuilder.addSelect(schedulingTypeCase, "scheduling_type_order");
      queryBuilder.addSelect(communicationTypeCase, "communication_type_order");
      queryBuilder.addSelect(interpretingTypeCase, "interpreting_type_order");

      queryBuilder.addOrderBy("scheduling_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("communication_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("interpreting_type_order", dto.schedulingTypeOrder);
    }

    if (dto.topicOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("appointmentOrder.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("appointmentOrder.platformId", dto.platformIdOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("appointmentOrder.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("appointmentOrder.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder.addOrderBy("appointmentOrder.clientFirstName", dto.clientFirstNameOrder);
    }
  }

  private applyOrderingForAppointmentOrderGroup(
    queryBuilder: SelectQueryBuilder<AppointmentOrderGroup>,
    dto: GetAllAppointmentOrdersDto,
  ): void {
    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.schedulingType",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.communicationType",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "appointmentOrder.interpretingType",
        appointmentInterpretingTypeOrder,
      );

      queryBuilder.addSelect(schedulingTypeCase, "scheduling_type_order");
      queryBuilder.addSelect(communicationTypeCase, "communication_type_order");
      queryBuilder.addSelect(interpretingTypeCase, "interpreting_type_order");

      queryBuilder.addOrderBy("scheduling_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("communication_type_order", dto.schedulingTypeOrder);
      queryBuilder.addOrderBy("interpreting_type_order", dto.schedulingTypeOrder);
    }

    if (dto.topicOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("appointmentOrder.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("appointmentOrderGroup.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("appointmentOrderGroup.platformId", dto.platformIdOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("appointmentOrder.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("appointmentOrder.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder.addOrderBy("appointmentOrder.clientFirstName", dto.clientFirstNameOrder);
    }
  }

  public getAppointmentOrderByIdOptions(id: string): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        appointment: {
          id: true,
          sameInterpreter: true,
          participants: true,
          client: {
            id: true,
            role: {
              name: true,
            },
            profile: {
              firstName: true,
              lastName: true,
              gender: true,
            },
            user: {
              platformId: true,
              avatarUrl: true,
            },
          },
        },
      },
      where: { id },
      relations: {
        appointment: {
          participants: true,
          client: {
            user: true,
            role: true,
            profile: true,
          },
        },
      },
    };
  }

  public getOrdersInGroupByIdOptions(id: string): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        appointmentOrders: {
          id: true,
          platformId: true,
          appointmentOrderGroupId: true,
          isOrderGroup: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          communicationType: true,
          schedulingType: true,
          schedulingDurationMin: true,
          topic: true,
          interpreterType: true,
          interpretingType: true,
          languageFrom: true,
          languageTo: true,
          approximateCost: true,
          clientPlatformId: true,
          clientFirstName: true,
          clientLastName: true,
          participantType: true,
          operatedByCompanyName: true,
          appointment: {
            id: true,
            sameInterpreter: true,
            client: {
              id: true,
              role: {
                name: true,
              },
              profile: {
                firstName: true,
                lastName: true,
                gender: true,
              },
              user: {
                platformId: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      where: { id },
      relations: {
        appointmentOrders: {
          appointment: {
            client: {
              user: true,
              profile: true,
              role: true,
            },
          },
        },
      },
    };
  }

  public getListOfInterpretersReceivedOrderOptions(
    appointmentId: string,
    dto: GetAllListInterpretersDto,
  ): { query: string; parameters: (string | number)[] } {
    return this.getListOfInterpretersReceivedOrderOptionsGeneric(
      "appointment_orders",
      "appointment_id",
      "AND is_order_group = false",
      appointmentId,
      dto,
    );
  }

  public getListOfInterpretersReceivedOrderGroupOptions(
    groupId: string,
    dto: GetAllListInterpretersDto,
  ): { query: string; parameters: (string | number)[] } {
    return this.getListOfInterpretersReceivedOrderOptionsGeneric(
      "appointment_order_groups",
      "platform_id",
      "",
      groupId,
      dto,
    );
  }

  /**
   * The query will return a list of interpreters that received an order, either
   * ignored or declined the order. The list will be ordered by the userRole.id
   * field. The query will also return the total count of records.
   *
   * @param {string} tableName The name of the table to query. Either "appointment_orders" or "appointment_order_groups".
   * @param {string} idColumn The name of the column to use for the WHERE clause. Either "appointment_id" or "platform_id".
   * @param {string} extraWhere An extra WHERE clause to add to the query.
   * @param {string} orderId The value for the WHERE clause.
   * @param {GetAllListInterpretersDto} dto The pagination options.
   *
   * @returns {{ query: string, parameters: (string | number)[] }}
   */
  public getListOfInterpretersReceivedOrderOptionsGeneric(
    tableName: string,
    idColumn: string,
    extraWhere: string,
    orderId: string,
    dto: GetAllListInterpretersDto,
  ): { query: string; parameters: (string | number)[] } {
    const interpreterJsonBuild: string = `
    json_build_object(
      'id', interpreter_profiles.id,
      'userRole', json_build_object(
        'id', user_roles.id,
        'country', user_roles.country,
        'operatedByCompanyId', user_roles.operated_by_company_id,
        'operatedByCompanyName', user_roles.operated_by_company_name,
        'user', json_build_object(
          'platformId', users.platform_id
        ),
        'profile', json_build_object(
          'firstName', user_profiles.first_name,
          'lastName', user_profiles.last_name
        )
      ),
      'knownLevels', interpreter_profiles.known_levels,
      'endOfWorkDay', interpreter_profiles.end_of_work_day,
      'onlineSince', interpreter_profiles.online_since,
      'offlineSince', interpreter_profiles.offline_since
    ) AS interpreter
  `;

    const fromAndJoins: string = `
    FROM interpreter_profiles
    CROSS JOIN appointment
    LEFT JOIN user_roles ON interpreter_profiles.user_role_id = user_roles.id
    LEFT JOIN users ON user_roles.user_id = users.id
    LEFT JOIN user_profiles ON user_profiles.user_role_id = user_roles.id
  `;

    const query: string = `
    WITH appointment AS (
      SELECT matched_interpreter_ids, rejected_interpreter_ids
      FROM ${tableName}
      WHERE ${idColumn} = $3
      ${extraWhere}
    ),
    ignored AS (
      SELECT
        'ignored' AS type,
        interpreter_profiles.id AS ordering,
        ${interpreterJsonBuild}
      ${fromAndJoins}
      WHERE interpreter_profiles.user_role_id = ANY(appointment.matched_interpreter_ids)
    ),
    declined AS (
      SELECT
        'declined' AS type,
        interpreter_profiles.id AS ordering,
        ${interpreterJsonBuild}
      ${fromAndJoins}
      WHERE interpreter_profiles.user_role_id = ANY(appointment.rejected_interpreter_ids)
    ),
    combined AS (
      SELECT * FROM ignored
      UNION ALL
      SELECT * FROM declined
    )
    SELECT json_build_object(
      'data', json_agg(temp_record),
      'total', (SELECT COUNT(*) FROM combined)
    ) AS result
    FROM (
      SELECT type, interpreter
      FROM combined
      ORDER BY ordering
      LIMIT $1 OFFSET $2
    ) AS temp_record;
  `;

    return {
      query,
      parameters: [dto.limit, dto.offset, orderId],
    };
  }

  public getNewOrderForWebSocketOptions(lastChecked: Date): FindOneOptions<AppointmentOrder> {
    return {
      select: {
        appointment: {
          id: true,
          sameInterpreter: true,
        },
      },
      where: { isOrderGroup: false, creationDate: MoreThan(lastChecked) },
      order: { creationDate: ESortOrder.ASC },
      relations: { appointment: true },
    };
  }

  public getNewOrdersForWebSocketOptions(lastChecked: Date): FindOneOptions<AppointmentOrderGroup> {
    return {
      select: {
        appointmentOrders: {
          id: true,
          platformId: true,
          appointmentOrderGroupId: true,
          isOrderGroup: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          communicationType: true,
          schedulingType: true,
          schedulingDurationMin: true,
          topic: true,
          interpreterType: true,
          interpretingType: true,
          languageFrom: true,
          languageTo: true,
          approximateCost: true,
          clientPlatformId: true,
          clientFirstName: true,
          clientLastName: true,
          participantType: true,
          operatedByCompanyName: true,
          appointment: {
            id: true,
            sameInterpreter: true,
          },
        },
      },
      where: { appointmentOrders: { isOrderGroup: true }, creationDate: MoreThan(lastChecked) },
      relations: { appointmentOrders: { appointment: true } },
    };
  }

  /**
   ** AppointmentOrderRecreationService
   */

  public getUpdatedAppointmentsRelations(): FindOptionsRelations<Appointment> {
    return {
      participants: true,
      address: true,
      client: {
        profile: true,
        role: true,
        user: true,
      },
      interpreter: {
        interpreterProfile: true,
        role: true,
      },
      appointmentOrder: {
        appointmentOrderGroup: {
          appointmentOrders: true,
        },
      },
      appointmentAdminInfo: true,
      chimeMeetingConfiguration: {
        attendees: true,
        appointment: true,
      },
      appointmentReminder: true,
    };
  }

  public getGroupRecreationOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      where: {
        appointmentsGroupId: groupId,
        status: In([EAppointmentStatus.PENDING, EAppointmentStatus.ACCEPTED]),
      },
      relations: {
        address: true,
        appointmentAdminInfo: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: {
          appointmentOrderGroup: {
            appointmentOrders: true,
          },
        },
        participants: true,
        client: {
          profile: true,
          role: true,
          user: true,
        },
        interpreter: {
          interpreterProfile: true,
          role: true,
        },
        appointmentReminder: true,
      },
    };
  }

  public getCancelAppointmentGroupRecreationOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      select: {
        client: {
          id: true,
          operatedByCompanyId: true,
          operatedByCompanyName: true,
          user: {
            id: true,
            platformId: true,
          },
        },
      },
      where: { appointmentsGroupId: groupId },
      relations: {
        appointmentOrder: {
          appointmentOrderGroup: {
            appointmentOrders: true,
          },
        },
        interpreter: true,
        client: {
          profile: true,
          role: true,
          user: true,
        },
      },
    };
  }

  public getPendingAppointmentsWithoutInterpreterOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      where: {
        appointmentsGroupId: groupId,
        interpreter: IsNull(),
        status: EAppointmentStatus.PENDING,
      },
      relations: {
        address: true,
        client: {
          profile: true,
          role: true,
          user: true,
        },
        appointmentOrder: {
          appointmentOrderGroup: {
            appointmentOrders: true,
          },
        },
      },
    };
  }

  /**
   ** OrderSchedulerService
   */

  public getNextRepeatTimeOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: this.getSelectConditionsForNextRepeatTime(),
      where: {
        isOrderGroup: false,
        nextRepeatTime: LessThanOrEqual(currentTime),
        remainingRepeats: MoreThan(0),
      },
    };
  }

  public getNextRepeatTimeOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: this.getSelectConditionsForNextRepeatTime(),
      where: {
        nextRepeatTime: LessThanOrEqual(currentTime),
        remainingRepeats: MoreThan(0),
      },
    };
  }

  private getSelectConditionsForNextRepeatTime(): FindOptionsSelect<AppointmentOrder | AppointmentOrderGroup> {
    return {
      id: true,
      platformId: true,
      nextRepeatTime: true,
      repeatInterval: true,
      remainingRepeats: true,
      matchedInterpreterIds: true,
    };
  }

  public getNotifyAdminOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        platformId: true,
        isOrderGroup: true,
        notifyAdmin: true,
        appointment: {
          id: true,
        },
      },
      where: {
        isOrderGroup: false,
        notifyAdmin: LessThanOrEqual(currentTime),
      },
      relations: {
        appointment: true,
      },
    };
  }

  public getNotifyAdminOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        notifyAdmin: true,
      },
      where: {
        notifyAdmin: LessThanOrEqual(currentTime),
      },
    };
  }

  public getEndSearchTimeOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
        isOrderGroup: true,
        endSearchTime: true,
        appointment: {
          id: true,
        },
      },
      where: {
        isOrderGroup: false,
        endSearchTime: LessThanOrEqual(currentTime),
      },
      relations: {
        appointment: true,
      },
    };
  }

  public getEndSearchTimeOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
        platformId: true,
        sameInterpreter: true,
        endSearchTime: true,
      },
      where: {
        endSearchTime: LessThanOrEqual(currentTime),
      },
    };
  }

  public getSearchEngineTasksOrdersOptions(currentTime: Date): FindManyOptions<AppointmentOrder> {
    return {
      select: {
        id: true,
      },
      where: [
        {
          isFirstSearchCompleted: false,
          isSearchNeeded: true,
          appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
        },
        {
          isFirstSearchCompleted: true,
          isSecondSearchCompleted: false,
          isSearchNeeded: true,
          timeToRestart: LessThanOrEqual(currentTime),
          appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
        },
      ],
    };
  }

  public getSearchEngineTasksOrderGroupsOptions(currentTime: Date): FindManyOptions<AppointmentOrderGroup> {
    return {
      select: {
        id: true,
      },
      where: [
        {
          isFirstSearchCompleted: false,
          isSearchNeeded: true,
          appointmentOrders: {
            appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
          },
        },
        {
          isFirstSearchCompleted: true,
          isSecondSearchCompleted: false,
          isSearchNeeded: true,
          timeToRestart: LessThanOrEqual(currentTime),
          appointmentOrders: {
            appointment: { interpretingType: Not(EAppointmentInterpretingType.ESCORT) },
          },
        },
      ],
    };
  }
}
