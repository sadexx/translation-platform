import { Injectable } from "@nestjs/common";
import { Brackets, SelectQueryBuilder } from "typeorm";
import { User } from "src/modules/users/entities";
import { GetDropdownCompaniesDto, GetDropdownUsersDto } from "src/modules/toolbox/common/dto";
import { ESortOrder } from "src/common/enums";
import { Company } from "src/modules/companies/entities";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { Appointment } from "src/modules/appointments/entities";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { INTERPRETER_ROLES } from "src/common/constants";

@Injectable()
export class ToolboxQueryOptionsService {
  constructor() {}

  public getActiveLanguagesOptions(): string {
    return `
      SELECT DISTINCT language
      FROM (
        SELECT "language_from"::TEXT AS language FROM language_pairs
        UNION ALL
        SELECT "language_to"::TEXT AS language FROM language_pairs
      ) AS unique_languages;
    `;
  }

  public getDropdownCompaniesOptions(queryBuilder: SelectQueryBuilder<Company>, dto: GetDropdownCompaniesDto): void {
    queryBuilder
      .select(["company.id", "company.platformId", "company.name"])
      .addOrderBy("company.creationDate", ESortOrder.ASC);
    this.applyFiltersForDropdownCompanies(queryBuilder, dto);
  }

  private applyFiltersForDropdownCompanies(
    queryBuilder: SelectQueryBuilder<Company>,
    dto: GetDropdownCompaniesDto,
  ): void {
    if (dto.companyTypes) {
      queryBuilder.andWhere("company.companyType IN (:...companyTypes)", { companyTypes: dto.companyTypes });
    }

    if (dto.searchField) {
      this.applySearchForDropdownCompanies(queryBuilder, dto.searchField);
    }
  }

  private applySearchForDropdownCompanies(queryBuilder: SelectQueryBuilder<Company>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("company.platformId ILIKE :search", { search: searchTerm }).orWhere("company.name ILIKE :search", {
          search: searchTerm,
        });
      }),
    );
  }

  public getDropdownUsersOptions(
    queryBuilder: SelectQueryBuilder<User>,
    dto: GetDropdownUsersDto,
    userRole: UserRole,
  ): void {
    queryBuilder
      .select(["user.platformId"])
      .leftJoin("user.userRoles", "userRole")
      .addSelect(["userRole.id", "userRole.operatedByCompanyId"])
      .leftJoin("userRole.role", "role")
      .addSelect(["role.name"])
      .leftJoin("userRole.profile", "profile")
      .addSelect(["profile.firstName", "profile.lastName"]);

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder.andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }

    this.applyFiltersForDropdownUsers(queryBuilder, dto);
  }

  private applyFiltersForDropdownUsers(queryBuilder: SelectQueryBuilder<User>, dto: GetDropdownUsersDto): void {
    queryBuilder.andWhere("role.name IN (:...roles)", { roles: dto.roles });
    queryBuilder.andWhere("userRole.isActive = true");

    if (dto.operatedByCompanyId) {
      queryBuilder.andWhere("userRole.operatedByCompanyId = :operatedByCompanyId", {
        operatedByCompanyId: dto.operatedByCompanyId,
      });
    }

    if (dto.searchField) {
      this.applySearchForDropdownUsers(queryBuilder, dto.searchField);
    }
  }

  private applySearchForDropdownUsers(queryBuilder: SelectQueryBuilder<User>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("user.platformId ILIKE :search", { search: searchTerm }).orWhere(
          "CONCAT(profile.firstName, ' ', profile.lastName) ILIKE :search",
          {
            search: searchTerm,
          },
        );
      }),
    );
  }

  public hasNewCompanyRequestsQueryOptions(queryBuilder: SelectQueryBuilder<Company>): void {
    queryBuilder
      .leftJoin("contact_forms", "contactForm", "TRUE")
      .where("company.status = :status AND company.subStatus IS NULL", { status: ECompanyStatus.NEW_REQUEST })
      .orWhere("contactForm.isViewed = false");
  }

  public hasAppointmentOrdersQueryOptions(
    queryBuilder: SelectQueryBuilder<AppointmentOrder>,
    userRoleId: string,
  ): void {
    queryBuilder
      .leftJoin("order.appointmentOrderGroup", "orderGroup")
      .where("order.matchedInterpreterIds @> ARRAY[:userRoleId]::uuid[]", { userRoleId })
      .orWhere("orderGroup.matchedInterpreterIds @> ARRAY[:userRoleId]::uuid[]", { userRoleId });
  }

  public busyInterpretersQueryOptions(queryBuilder: SelectQueryBuilder<Appointment>, userRole: UserRole): void {
    queryBuilder
      .select("appointment.interpreterId", "interpreterId")
      .where("appointment.status = :status", { status: EAppointmentStatus.LIVE });

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder
        .innerJoin("appointment.interpreter", "userRole")
        .andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }
  }

  public onlineInterpretersQueryOptions(
    queryBuilder: SelectQueryBuilder<InterpreterProfile>,
    currentDate: Date,
    busyInterpreterIds: (string | null)[],
    userRole: UserRole,
  ): void {
    queryBuilder
      .where(
        `(interpreterProfile.isOnlineForAudio = true
       OR interpreterProfile.isOnlineForVideo = true
       OR interpreterProfile.isOnlineForFaceToFace = true)`,
      )
      .andWhere("interpreterProfile.endOfWorkDay > :currentDate", { currentDate })
      .andWhere(
        busyInterpreterIds.length ? "interpreterProfile.user_role_id NOT IN (:...busyInterpreterIds)" : "TRUE",
        { busyInterpreterIds },
      );

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder
        .innerJoin("interpreterProfile.userRole", "userRole")
        .andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }
  }

  public offlineInterpretersQueryOptions(
    queryBuilder: SelectQueryBuilder<UserRole>,
    currentDate: Date,
    busyInterpreterIds: (string | null)[],
    userRole: UserRole,
  ): void {
    queryBuilder
      .leftJoinAndSelect("userRole.interpreterProfile", "interpreterProfile")
      .leftJoin("userRole.role", "role")
      .where(
        `(
          interpreterProfile.id IS NULL
          OR
          (
            (interpreterProfile.isOnlineForAudio = false
             AND interpreterProfile.isOnlineForVideo = false
             AND interpreterProfile.isOnlineForFaceToFace = false)
            OR
            (
              (interpreterProfile.isOnlineForAudio = true
               OR interpreterProfile.isOnlineForVideo = true
               OR interpreterProfile.isOnlineForFaceToFace = true)
              AND interpreterProfile.endOfWorkDay < :currentDate
            )
          )
        )
        AND role.name IN (:...roles)
        ${busyInterpreterIds.length ? `AND userRole.id NOT IN (:...busyInterpreterIds)` : ""}`,
        { currentDate, busyInterpreterIds, roles: INTERPRETER_ROLES },
      );

    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      queryBuilder.andWhere("userRole.operatedByCompanyId = :companyId", { companyId: userRole.operatedByCompanyId });
    }
  }
}
