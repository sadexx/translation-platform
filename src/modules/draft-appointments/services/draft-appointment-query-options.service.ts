import { Injectable } from "@nestjs/common";
import { Brackets, FindManyOptions, FindOneOptions, FindOptionsWhere, SelectQueryBuilder } from "typeorm";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { GetAllDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { generateCaseForEnumOrder } from "src/common/utils";
import {
  appointmentCommunicationTypeOrder,
  appointmentInterpretingTypeOrder,
  appointmentSchedulingTypeOrder,
  appointmentTopicOrder,
} from "src/modules/appointments/common/enums";
import { languageOrder } from "src/modules/interpreter-profile/common/enum";
import { CLIENT_ROLES } from "src/common/constants";

@Injectable()
export class DraftAppointmentQueryOptionsService {
  public getAllDraftAppointmentsForAdminOptions(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto?: GetAllDraftAppointmentsDto,
  ): void {
    queryBuilder
      .leftJoin("draftAppointment.client", "client")
      .addSelect("client.id")
      .leftJoin("client.role", "clientRole")
      .addSelect("clientRole.name")
      .leftJoin("client.profile", "clientProfile")
      .addSelect(["clientProfile.firstName", "clientProfile.lastName", "clientProfile.gender"])
      .leftJoin("client.user", "clientUser")
      .addSelect(["clientUser.id", "clientUser.platformId", "clientUser.avatarUrl"])
      .leftJoinAndSelect("draftAppointment.draftAddress", "draftAddress")
      .leftJoinAndSelect("draftAppointment.draftExtraDays", "draftExtraDays");

    if (dto) {
      this.applyFiltersForAdmin(queryBuilder, dto);
      this.applyOrdering(queryBuilder, dto);
      queryBuilder.take(dto.limit);
      queryBuilder.skip(dto.offset);
    }
  }

  private applyFiltersForAdmin(
    queryBuilder: SelectQueryBuilder<DraftAppointment>,
    dto: GetAllDraftAppointmentsDto,
  ): void {
    if (dto.searchField) {
      this.applySearchForAdmin(queryBuilder, dto.searchField);
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("draftAppointment.schedulingType IN (:...schedulingTypes)", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("draftAppointment.interpretingType IN (:...interpretingTypes)", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("draftAppointment.topic IN (:...topics)", {
        topics: dto.topics,
      });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("draftAppointment.communicationType IN (:...communicationTypes)", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.languageFrom) {
      queryBuilder.andWhere("draftAppointment.languageFrom = :languageFrom", { languageFrom: dto.languageFrom });
    }

    if (dto.languageTo) {
      queryBuilder.andWhere("draftAppointment.languageTo = :languageTo", { languageTo: dto.languageTo });
    }

    if (dto.schedulingDurationMin) {
      queryBuilder.andWhere("draftAppointment.schedulingDurationMin = :schedulingDurationMin", {
        schedulingDurationMin: dto.schedulingDurationMin,
      });
    }

    if (dto.operatedByCompanyId) {
      queryBuilder.andWhere("draftAppointment.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: dto.operatedByCompanyId,
      });
    }

    if (dto.clientOperatedByCompanyId) {
      queryBuilder.andWhere("client.operatedByCompanyId = :clientOperatedByCompanyId", {
        clientOperatedByCompanyId: dto.clientOperatedByCompanyId,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("draftAppointment.scheduledStartTime BETWEEN :startDate AND :endDate", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    } else if (dto.startDate) {
      queryBuilder.andWhere("draftAppointment.scheduledStartTime >= :startDate", { startDate: dto.startDate });
    } else if (dto.endDate) {
      queryBuilder.andWhere("draftAppointment.scheduledStartTime <= :endDate", { endDate: dto.endDate });
    }
  }

  private applySearchForAdmin(queryBuilder: SelectQueryBuilder<DraftAppointment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("draftAppointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.topic AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.schedulingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.communicationType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(draftAppointment.interpretingType AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(draftAppointment.languageFrom, ' - ', draftAppointment.languageTo) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("draftAddress.streetName ILIKE :search", { search: searchTerm })
          .orWhere("draftAddress.suburb ILIKE :search", { search: searchTerm })
          .orWhere("draftAddress.state ILIKE :search", { search: searchTerm })
          .orWhere("CONCAT(clientProfile.firstName, ' ', clientProfile.lastName) ILIKE :search", {
            search: searchTerm,
          })
          .orWhere("clientUser.platformId ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrdering(queryBuilder: SelectQueryBuilder<DraftAppointment>, dto: GetAllDraftAppointmentsDto): void {
    if (dto.sortOrder) {
      queryBuilder.addOrderBy("draftAppointment.creationDate", dto.sortOrder);
    }

    if (dto.platformIdOrder) {
      queryBuilder.addOrderBy("draftAppointment.platformId", dto.platformIdOrder);
    }

    if (dto.schedulingTypeOrder) {
      const schedulingTypeCase = generateCaseForEnumOrder(
        "draftAppointment.scheduling_type",
        appointmentSchedulingTypeOrder,
      );
      const communicationTypeCase = generateCaseForEnumOrder(
        "draftAppointment.communication_type",
        appointmentCommunicationTypeOrder,
      );
      const interpretingTypeCase = generateCaseForEnumOrder(
        "draftAppointment.interpreting_type",
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
      const caseStatement = generateCaseForEnumOrder("draftAppointment.topic", appointmentTopicOrder);
      queryBuilder.addSelect(caseStatement, "topic_order");
      queryBuilder.addOrderBy("topic_order", dto.topicOrder);
    }

    if (dto.languageOrder) {
      const caseStatement = generateCaseForEnumOrder("draftAppointment.languageFrom", languageOrder);
      queryBuilder.addSelect(caseStatement, "language_order");
      queryBuilder.addOrderBy("language_order", dto.languageOrder);
    }

    if (dto.scheduledStartTimeOrder) {
      queryBuilder.addOrderBy("draftAppointment.scheduledStartTime", dto.scheduledStartTimeOrder);
    }

    if (dto.schedulingDurationMinOrder) {
      queryBuilder.addOrderBy("draftAppointment.schedulingDurationMin", dto.schedulingDurationMinOrder);
    }

    if (dto.operatedByCompanyNameOrder) {
      queryBuilder.addOrderBy("draftAppointment.operatedByCompanyName", dto.operatedByCompanyNameOrder);
    }

    if (dto.clientFirstNameOrder) {
      queryBuilder.addOrderBy("clientProfile.firstName", dto.clientFirstNameOrder);
    }
  }

  public getAllDraftAppointmentsForClientOptions(userRoleId: string): FindManyOptions<DraftAppointment> {
    return {
      where: {
        clientId: userRoleId,
      },
      relations: {
        draftParticipants: true,
        draftAddress: true,
        draftExtraDays: {
          draftAddress: true,
        },
      },
    };
  }

  public getDraftAppointmentForClientOptions(id: string, userRoleId: string): FindOneOptions<DraftAppointment> {
    return {
      where: {
        id: id,
        clientId: userRoleId,
      },
      relations: {
        draftParticipants: true,
        draftAddress: true,
        draftExtraDays: {
          draftAddress: true,
        },
      },
    };
  }

  public getDraftAppointmentForAdminOptions(id: string): FindOneOptions<DraftAppointment> {
    return {
      select: {
        client: {
          id: true,
          user: {
            id: true,
            platformId: true,
            avatarUrl: true,
          },
          profile: {
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
      },
      where: {
        id: id,
      },
      relations: {
        client: {
          user: true,
          profile: true,
        },
        draftParticipants: true,
        draftAddress: true,
        draftExtraDays: {
          draftAddress: true,
        },
      },
    };
  }

  public getClientForCreateDraftAppointmentOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByCompanyName: true,
        user: {
          id: true,
          email: true,
        },
      },
      where: { id: userRoleId },
      relations: {
        role: true,
        user: true,
      },
    };
  }

  public getDeleteDraftAppointmentOptions(id: string, user: ITokenUserData): FindOptionsWhere<UserRole> {
    const queryOptions: FindOptionsWhere<DraftAppointment> = {
      id: id,
    };

    if (CLIENT_ROLES.includes(user.role)) {
      queryOptions.clientId = user.userRoleId;
    }

    return queryOptions;
  }
}
