import { Injectable } from "@nestjs/common";
import {
  Between,
  Brackets,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Not,
  SelectQueryBuilder,
} from "typeorm";
import { Appointment, AppointmentEndDetail, AppointmentRating } from "src/modules/appointments/entities";
import { GetAllAppointmentsDto } from "src/modules/appointments/common/dto";
import { generateCaseForEnumOrder } from "src/common/utils";
import {
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentSchedulingTypeOrder,
  appointmentStatusOrder,
  appointmentTopicOrder,
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { ESortOrder } from "src/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { languageOrder } from "src/modules/interpreter-profile/common/enum";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { INTERPRETER_ROLES, LFH_ADMIN_ROLES } from "src/common/constants";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments-shared/common/constants";

@Injectable()
export class AppointmentQueryOptionsService {
  constructor() {}

  /**
   ** AppointmentCancelService
   */

  public getCancelAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        client: {
          id: true,
          operatedByCompanyId: true,
          operatedByCompanyName: true,
          country: true,
          timezone: true,
          user: {
            id: true,
            platformId: true,
          },
        },
      },
      where: { id: id },
      relations: {
        client: {
          profile: true,
          role: true,
          user: true,
        },
        address: true,
        interpreter: true,
        appointmentOrder: {
          appointmentOrderGroup: {
            appointmentOrders: true,
          },
        },
        appointmentAdminInfo: true,
        chimeMeetingConfiguration: {
          attendees: true,
        },
        appointmentReminder: true,
      },
    };
  }

  public getCancelGroupAppointmentsOptions(groupId: string): FindManyOptions<Appointment> {
    return {
      select: {
        client: {
          id: true,
          operatedByCompanyId: true,
          operatedByCompanyName: true,
          country: true,
          timezone: true,
          user: {
            id: true,
            platformId: true,
          },
        },
      },
      where: { appointmentsGroupId: groupId },
      relations: {
        interpreter: true,
        appointmentAdminInfo: true,
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
        chimeMeetingConfiguration: {
          attendees: true,
        },
        appointmentReminder: true,
      },
    };
  }

  /**
   ** AppointmentCommandService
   */

  public getDeleteAppointmentOptions(id: string, userId: string): FindOneOptions<Appointment> {
    return {
      select: {
        participants: {
          id: true,
        },
        chimeMeetingConfiguration: {
          id: true,
          attendees: {
            id: true,
          },
        },
        appointmentOrder: {
          id: true,
          appointmentOrderGroup: {
            id: true,
          },
        },
        address: {
          id: true,
        },
      },
      where: { id: id, client: { userId: userId } },
      relations: {
        participants: true,
        chimeMeetingConfiguration: {
          attendees: true,
        },
        appointmentOrder: {
          appointmentOrderGroup: true,
        },
        address: true,
      },
    };
  }

  public getArchiveAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      where: { id: id },
      relations: {
        client: true,
        interpreter: true,
      },
    };
  }

  public getSendLateNotificationOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        status: true,
        clientId: true,
        interpreterId: true,
        communicationType: true,
      },
      where: { id },
    };
  }

  public getConfirmExternalInterpreterFoundOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: { id: true, appointmentAdminInfo: { id: true } },
      where: { id },
      relations: { appointmentAdminInfo: true },
    };
  }

  /**
   ** AppointmentCreateService
   */

  public getClientForCreateAppointmentOptions(id: string): FindOneOptions<UserRole> {
    return {
      select: {
        user: {
          id: true,
          platformId: true,
          phoneNumber: true,
        },
      },
      where: { id: id },
      relations: {
        profile: true,
        role: true,
        user: true,
      },
    };
  }

  /**
   ** AppointmentEndService
   */

  public getEndCompletedAppointmentOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        status: true,
        clientId: true,
        interpreterId: true,
        scheduledStartTime: true,
        schedulingDurationMin: true,
        appointmentsGroupId: true,
        interpreter: {
          id: true,
          interpreterProfile: {
            id: true,
            interpreterBadgePdf: true,
          },
        },
      },
      where: { id },
      relations: { appointmentEndDetail: true, interpreter: { interpreterProfile: true } },
    };
  }

  public getCreateOrUpdateAppointmentEndDetailsOptions(id: string): FindOneOptions<AppointmentEndDetail> {
    return {
      where: { appointment: { id: id } },
    };
  }

  /**
   ** AppointmentQueryService
   */

  public getAllAppointmentsForClientOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    user: ITokenUserData,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): void {
    queryBuilder
      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoin("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.gender"])
      .leftJoin("interpreter.user", "interpreterUser")
      .addSelect(["interpreterUser.id", "interpreterUser.platformId", "interpreterUser.avatarUrl"])
      .leftJoinAndSelect("appointment.address", "address")
      .where("appointment.clientId = :clientId", { clientId: user.userRoleId })
      .andWhere("appointment.archivedByClient = :archived", { archived });

    if (appointmentsGroupId) {
      queryBuilder.andWhere("appointment.isGroupAppointment = :isGroupAppointment", { isGroupAppointment: true });
      queryBuilder.andWhere("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId });
    }

    if (dto) {
      this.applyFiltersForClient(queryBuilder, dto);
      this.applyOrdering(queryBuilder, dto);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  public getAllAppointmentsForInterpreterOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    user: ITokenUserData,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): void {
    queryBuilder
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.lastName", "clientProfile.gender"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.id", "clientUser.platformId", "clientUser.avatarUrl"])
      .leftJoinAndSelect("appointment.address", "address")
      .where("appointment.interpreterId = :interpreterId", { interpreterId: user.userRoleId })
      .andWhere("appointment.archivedByInterpreter = :archived", { archived });

    if (appointmentsGroupId) {
      queryBuilder.andWhere("appointment.isGroupAppointment = :isGroupAppointment", { isGroupAppointment: true });
      queryBuilder.andWhere("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId });
    }

    if (dto) {
      this.applyFiltersForInterpreter(queryBuilder, dto);
      this.applyOrdering(queryBuilder, dto);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  public getAllAppointmentsForAdminOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    adminUserRole: UserRole,
    appointmentsGroupId?: string,
    archived: boolean = false,
    dto?: GetAllAppointmentsDto,
  ): void {
    queryBuilder
      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.lastName", "clientProfile.gender"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.id", "clientUser.platformId", "clientUser.avatarUrl"])

      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoin("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.gender"])
      .leftJoin("interpreter.user", "interpreterUser")
      .addSelect(["interpreterUser.id", "interpreterUser.platformId", "interpreterUser.avatarUrl"])

      .leftJoinAndSelect("appointment.address", "address")
      .leftJoinAndSelect("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .leftJoinAndSelect("appointmentAdminInfo.cancellations", "cancellations")
      .leftJoinAndSelect("appointment.discountAssociation", "discountAssociation")
      .leftJoin("appointment.appointmentRating", "appointmentRating")
      .addSelect(["appointmentRating.appointmentCallRating", "appointmentRating.interpreterRating"]);

    if (!LFH_ADMIN_ROLES.includes(adminUserRole.role.name)) {
      queryBuilder.where(
        "interpreter.operatedByCompanyId = :operatedByCompanyId OR (appointment.operatedByCompanyId = :operatedByCompanyId AND :isNotLFH = true)",
        {
          operatedByCompanyId: adminUserRole.operatedByCompanyId,
          isNotLFH: adminUserRole.operatedByCompanyId !== COMPANY_LFH_ID,
        },
      );
    }

    if (appointmentsGroupId) {
      queryBuilder.andWhere("appointment.isGroupAppointment = :isGroupAppointment", { isGroupAppointment: true });
      queryBuilder.andWhere("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId });
    }

    if (dto) {
      this.applyFiltersForAdmin(queryBuilder, dto, archived);
      this.applyOrdering(queryBuilder, dto, true);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  private applyFiltersForClient(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    if (dto.searchField) {
      this.applySearchForClient(queryBuilder, dto.searchField);
    }

    if (dto.interpreterOperatedByCompanyId) {
      queryBuilder.andWhere("interpreter.operatedByCompanyId = :interpreterOperatedByCompanyId", {
        interpreterOperatedByCompanyId: dto.interpreterOperatedByCompanyId,
      });
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyFiltersForInterpreter(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    if (dto.searchField) {
      this.applySearchForInterpreter(queryBuilder, dto.searchField);
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyFiltersForAdmin(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetAllAppointmentsDto,
    archived: boolean,
  ): void {
    if (archived) {
      if (dto.clientId) {
        queryBuilder.andWhere("appointment.archivedByClient = :archived", { archived });
      }

      if (dto.interpreterId) {
        queryBuilder.andWhere("appointment.archivedByInterpreter = :archived", { archived });
      }
    }

    if (dto.searchField) {
      this.applySearchForAdmin(queryBuilder, dto.searchField);
    }

    if (dto.isRedFlagOnly) {
      queryBuilder.andWhere("appointmentAdminInfo.isRedFlagEnabled = :isRedFlagOnly", { isRedFlagOnly: true });
    }

    if (dto.clientId) {
      queryBuilder.andWhere("appointment.clientId = :clientId", {
        clientId: dto.clientId,
      });
    }

    if (dto.interpreterId) {
      queryBuilder.andWhere("appointment.interpreterId = :interpreterId", {
        interpreterId: dto.interpreterId,
      });
    }

    if (dto.operatedByCompanyId) {
      queryBuilder.andWhere("appointment.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: dto.operatedByCompanyId,
      });
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    if (dto.interpreterOperatedByCompanyId) {
      queryBuilder.andWhere("interpreter.operatedByCompanyId = :interpreterOperatedByCompanyId", {
        interpreterOperatedByCompanyId: dto.interpreterOperatedByCompanyId,
      });
    }

    this.applyBaseFilters(queryBuilder, dto);
  }

  private applyBaseFilters(queryBuilder: SelectQueryBuilder<Appointment>, dto: GetAllAppointmentsDto): void {
    if (dto.statuses?.length) {
      queryBuilder.andWhere("appointment.status IN (:...statuses)", {
        statuses: dto.statuses,
      });
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("appointment.schedulingType IN (:...schedulingTypes)", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("appointment.interpretingType IN (:...interpretingTypes)", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("appointment.topic IN (:...topics)", {
        topics: dto.topics,
      });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("appointment.communicationType IN (:...communicationTypes)", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("appointment.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("appointment.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.schedulingDurationMin) {
      queryBuilder.andWhere("appointment.schedulingDurationMin = :schedulingDurationMin", {
        schedulingDurationMin: dto.schedulingDurationMin,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("appointment.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    } else if (dto.startDate) {
      queryBuilder.andWhere("appointment.scheduledStartTime >= :startDate", { startDate: dto.startDate });
    } else if (dto.endDate) {
      queryBuilder.andWhere("appointment.scheduledStartTime <= :endDate", { endDate: dto.endDate });
    }
  }

  private applySearchForClient(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.streetName ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(interpreterProfile.firstName, ' ', interpreterProfile.lastName) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("interpreterUser.platformId ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applySearchForInterpreter(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
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

  private applySearchForAdmin(queryBuilder: SelectQueryBuilder<Appointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.status AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(appointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(appointment.languageFrom, ' - ', appointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("address.streetName ILIKE :search", { search: searchTerm })
          .orWhere("address.suburb ILIKE :search", { search: searchTerm })
          .orWhere("address.state ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(clientProfile.firstName, ' ', clientProfile.lastName) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("clientUser.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(interpreterProfile.firstName, ' ', interpreterProfile.lastName) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("interpreterUser.platformId ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrdering(
    queryBuilder: SelectQueryBuilder<Appointment>,
    dto: GetAllAppointmentsDto,
    forAdmin: boolean = false,
  ): void {
    if (forAdmin) {
      queryBuilder.addOrderBy("appointmentAdminInfo.isRedFlagEnabled", ESortOrder.DESC);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("appointment.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("appointment.platformId", dto.platformIdOrder);
    }

    if (dto.statusOrder) {
      const caseStatement = generateCaseForEnumOrder("appointment.status", appointmentStatusOrder);
      queryBuilder.addSelect(caseStatement, "status_order");
      queryBuilder.addOrderBy("status_order", dto.statusOrder);
    }

    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "appointment.scheduling_type",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "appointment.communication_type",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "appointment.interpreting_type",
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
      const caseStatement = generateCaseForEnumOrder("appointment.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("appointment.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("appointment.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("appointment.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.operatedByCompanyNameOrder) {
      queryBuilder.addOrderBy("appointment.operatedByCompanyName", dto.operatedByCompanyNameOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder.addOrderBy("clientProfile.firstName", dto.clientFirstNameOrder);
    }

    if (dto.interpreterFirstNameOrder) {
      queryBuilder.addOrderBy("interpreterProfile.firstName", dto.interpreterFirstNameOrder);
    }
  }

  public getAppointmentForClientOrInterpreterOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    id: string,
    user: ITokenUserData,
  ): void {
    queryBuilder
      .leftJoinAndSelect("appointment.participants", "participants")
      .leftJoinAndSelect("appointment.address", "address")

      .leftJoin("appointment.client", "client")
      .addSelect("client.id")
      .leftJoinAndSelect("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.lastName", "clientProfile.gender"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.id", "clientUser.platformId", "clientUser.avatarUrl"])

      .leftJoin("appointment.interpreter", "interpreter")
      .addSelect("interpreter.id")
      .leftJoinAndSelect("interpreter.role", "interpreterRole")
      .addSelect("interpreterRole.name")
      .leftJoin("interpreter.profile", "interpreterProfile")
      .addSelect(["interpreterProfile.firstName", "interpreterProfile.gender"])
      .leftJoin("interpreter.user", "interpreterUser")
      .addSelect(["interpreterUser.id", "interpreterUser.platformId", "interpreterUser.avatarUrl"])

      .leftJoin("appointment.appointmentAdminInfo", "appointmentAdminInfo")
      .addSelect(["appointmentAdminInfo.id", "appointmentAdminInfo.isInterpreterFound"])
      .leftJoinAndSelect("appointment.appointmentEndDetail", "appointmentEndDetail")
      .leftJoin(
        "appointmentAdminInfo.cancellations",
        "cancellation",
        "cancellation.roleName NOT IN (:...interpreterRoles)",
        { interpreterRoles: INTERPRETER_ROLES },
      )
      .addSelect([
        "cancellation.id",
        "cancellation.cancelledById",
        "cancellation.cancelledByPlatformId",
        "cancellation.cancelledByFirstName",
        "cancellation.cancellationReason",
        "cancellation.roleName",
        "cancellation.creationDate",
      ])
      .leftJoin("appointment.appointmentRating", "appointmentRating")
      .addSelect([
        "appointmentRating.appointmentCallRating",
        "appointmentRating.appointmentCallRatingFeedback",
        "appointmentRating.interpreterRatedCallQuality",
        "appointmentRating.interpreterRating",
        "appointmentRating.interpreterRatingFeedback",
        "appointmentRating.clientRatedInterpreter",
      ])

      .leftJoin("appointment.blacklists", "blacklists", "blacklists.blockedByUserRoleId = :userRoleId", {
        userRoleId: user.userRoleId,
      })
      .addSelect([
        "blacklists.id",
        "blacklists.blockedByUserRoleId",
        "blacklists.blockedUserRoleId",
        "blacklists.creationDate",
      ])

      .where("appointment.id = :id", { id })
      .andWhere("(appointment.clientId = :userRoleId OR appointment.interpreterId = :userRoleId)", {
        userRoleId: user.userRoleId,
      });
  }

  public getAppointmentForAdminOptions(id: string): FindOneOptions<Appointment> {
    return {
      select: {
        interpreter: {
          id: true,
          role: {
            name: true,
          },
          profile: {
            firstName: true,
            gender: true,
          },
          user: {
            id: true,
            platformId: true,
            avatarUrl: true,
          },
        },
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
            id: true,
            platformId: true,
            avatarUrl: true,
          },
        },
        appointmentOrder: {
          id: true,
          endSearchTime: true,
          appointmentOrderGroup: {
            id: true,
            endSearchTime: true,
          },
        },
      },
      where: { id },
      relations: {
        appointmentAdminInfo: {
          cancellations: true,
        },
        participants: true,
        address: true,
        client: {
          profile: true,
          user: true,
          role: true,
        },
        interpreter: {
          profile: true,
          user: true,
          role: true,
        },
        appointmentRating: true,
        appointmentEndDetail: true,
        appointmentOrder: {
          appointmentOrderGroup: true,
        },
        blacklists: true,
      },
    };
  }

  public getAppointmentsGroupIdsOptions(queryBuilder: SelectQueryBuilder<Appointment>, user: ITokenUserData): void {
    queryBuilder
      .select("DISTINCT appointment.appointmentsGroupId", "appointmentsGroupId")
      .where("appointment.appointmentsGroupId IS NOT NULL");

    if (user.role !== EUserRoleName.SUPER_ADMIN) {
      queryBuilder
        .leftJoin("appointment.client", "client")
        .leftJoin("appointment.interpreter", "interpreter")
        .andWhere("(client.user_id = :userId OR interpreter.user_id = :userId)", { userId: user.id });
    }
  }

  /**
   ** AppointmentRatingService
   */

  public getAndValidateAppointmentRatingOptions(id: string): FindOneOptions<AppointmentRating> {
    return {
      select: {
        appointment: {
          id: true,
          status: true,
          interpreter: {
            id: true,
            interpreterProfile: {
              id: true,
              interpreterBadgePdf: true,
            },
          },
        },
      },
      where: { appointment: { id } },
      relations: { appointment: { interpreter: { interpreterProfile: true } } },
    };
  }

  public getToggleInterpreterRatingExclusionOptions(id: string): FindOneOptions<AppointmentRating> {
    return {
      select: {
        id: true,
        excludeInterpreterRating: true,
        interpreterId: true,
        appointment: {
          interpreterId: true,
          interpreter: {
            id: true,
            interpreterProfile: {
              id: true,
              interpreterBadgePdf: true,
            },
          },
        },
      },
      where: { appointment: { id } },
      relations: { appointment: { interpreter: { interpreterProfile: true } } },
    };
  }

  public getInterpreterRatingsOptions(interpreterId: string): FindManyOptions<AppointmentRating> {
    return {
      select: {
        interpreterRating: true,
      },
      where: {
        interpreterId,
        excludeInterpreterRating: false,
      },
    };
  }

  /**
   ** AppointmentSchedulerService
   */

  public getActivateUpcomingAppointmentsOptions(
    currentTime: Date,
    activationThresholdEnd: Date,
  ): FindOptionsWhere<Appointment> {
    return {
      status: EAppointmentStatus.ACCEPTED,
      scheduledStartTime: Between(currentTime, activationThresholdEnd),
    };
  }

  public getCloseInactiveOrPaymentFailedLiveAppointmentsOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    thresholdTime: Date,
  ): void {
    queryBuilder
      .select(["appointment.id", "appointment.clientLastActiveTime"])
      .leftJoin("appointment.chimeMeetingConfiguration", "chimeMeetingConfiguration")
      .addSelect(["chimeMeetingConfiguration.id", "chimeMeetingConfiguration.chimeMeetingId"])
      .where("appointment.communicationType != :communicationType", {
        communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
      })
      .andWhere("appointment.status = :status", { status: EAppointmentStatus.LIVE })
      .andWhere("appointment.alternativePlatform = :alternativePlatform", { alternativePlatform: false })
      .andWhere(
        `(
          appointment.clientLastActiveTime < :thresholdTime
          OR (
            (appointment.businessEndTime IS NOT NULL AND appointment.businessEndTime < :currentDate)
            OR (appointment.businessEndTime IS NULL AND appointment.scheduledEndTime < :currentDate)
          )
        )`,
        { thresholdTime, currentDate: new Date() },
      );
  }

  public getCloseExpiredAppointmentsWithoutClientVisitOptions(currentTime: Date): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        scheduledEndTime: true,
        clientId: true,
        interpreterId: true,
        appointmentsGroupId: true,
        channelId: true,
        platformId: true,
        chimeMeetingConfiguration: {
          id: true,
        },
        interpreter: {
          id: true,
          interpreterProfile: {
            interpreterBadgePdf: true,
          },
        },
      },
      where: {
        status: EAppointmentStatus.LIVE,
        communicationType: Not(EAppointmentCommunicationType.FACE_TO_FACE),
        alternativePlatform: false,
        clientLastActiveTime: IsNull(),
        scheduledEndTime: LessThan(currentTime),
      },
      relations: {
        chimeMeetingConfiguration: true,
        interpreter: {
          interpreterProfile: true,
        },
      },
    };
  }

  public getCloseExpiredScheduledMeetingsOptions(id: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: {
        appointment: {
          id: true,
          appointmentReminder: {
            id: true,
          },
        },
      },
      where: { id: id },
      relations: {
        appointment: {
          appointmentReminder: true,
        },
        attendees: true,
      },
    };
  }

  public getProcessCompletedAppointmentsOptions(currentTime: Date): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        clientId: true,
        interpreterId: true,
        platformId: true,
      },
      where: [
        {
          communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
          status: EAppointmentStatus.LIVE,
          scheduledEndTime: LessThanOrEqual(currentTime),
        },
        {
          communicationType: In(AUDIO_VIDEO_COMMUNICATION_TYPES),
          alternativePlatform: true,
          status: EAppointmentStatus.LIVE,
          scheduledEndTime: LessThanOrEqual(currentTime),
        },
      ],
    };
  }

  public getFinalizeCompletedAppointmentsAfterSignatureTimeoutOptions(
    signedTimeoutThreshold: Date,
  ): FindManyOptions<Appointment> {
    return {
      select: {
        interpreter: {
          id: true,
          interpreterProfile: {
            interpreterBadgePdf: true,
          },
        },
      },
      where: [
        {
          status: EAppointmentStatus.COMPLETED_ACTION_REQUIRED,
          appointmentEndDetail: {
            updatingDate: LessThan(signedTimeoutThreshold),
            clientSignature: Not(IsNull()),
          },
        },
        {
          status: EAppointmentStatus.COMPLETED_ACTION_REQUIRED,
          appointmentEndDetail: {
            updatingDate: LessThan(signedTimeoutThreshold),
            interpreterSignature: Not(IsNull()),
          },
        },
      ],
      relations: {
        appointmentEndDetail: true,
        interpreter: {
          interpreterProfile: true,
        },
      },
    };
  }

  public getInterpreterHasLateAppointmentsOptions(lateThreshold: Date): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        interpreterId: true,
      },
      where: {
        status: EAppointmentStatus.LIVE,
        schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
        communicationType: In(AUDIO_VIDEO_COMMUNICATION_TYPES),
        scheduledStartTime: LessThanOrEqual(lateThreshold),
        chimeMeetingConfiguration: { isInterpreterWasOnlineInBooking: IsNull() },
      },
    };
  }

  /**
   ** AppointmentUpdateService
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

  public getUpdateAppointmentSearchConditionsOptions(id: string, userRoleId: string): FindOneOptions<Appointment> {
    return {
      select: {
        id: true,
        topic: true,
        preferredInterpreterGender: true,
        isGroupAppointment: true,
        appointmentsGroupId: true,
        appointmentOrder: {
          id: true,
          appointmentOrderGroup: {
            id: true,
          },
        },
      },
      where: { id: id, clientId: userRoleId },
      relations: {
        appointmentOrder: {
          appointmentOrderGroup: true,
        },
      },
    };
  }
}
