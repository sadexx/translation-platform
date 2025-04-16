import { Injectable } from "@nestjs/common";
import { Brackets, SelectQueryBuilder } from "typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import {
  GetAllCorporatePromoCampaignsDto,
  GetAllPersonalPromoCampaignsDto,
} from "src/modules/promo-campaigns/common/dto";
import { EPromoCampaignCategory, promoCampaignStatusOrder } from "src/modules/promo-campaigns/common/enums";
import { generateCaseForEnumOrder } from "src/common/utils";

@Injectable()
export class PromoCampaignsQueryOptionsService {
  constructor() {}

  public getPersonalPromoCampaignsOptions(
    queryBuilder: SelectQueryBuilder<PromoCampaign>,
    dto: GetAllPersonalPromoCampaignsDto,
  ): void {
    queryBuilder
      .leftJoin("promoCampaign.discountHolders", "discountHolders")
      .leftJoin("discountHolders.company", "company")
      .where("promoCampaign.type = :type", { type: dto.type })
      .andWhere("promoCampaign.category = :category", { category: dto.category });

    this.applyFilters(queryBuilder, dto);
    this.applyOrdering(queryBuilder, dto);
    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  public getCorporatePromoCampaignsOptions(
    queryBuilder: SelectQueryBuilder<PromoCampaign>,
    dto: GetAllCorporatePromoCampaignsDto,
  ): void {
    queryBuilder
      .leftJoin("promoCampaign.discountHolders", "discountHolders")
      .leftJoin("discountHolders.company", "company")
      .where("promoCampaign.type = :type", { type: dto.type })
      .andWhere("promoCampaign.category = :category", { category: EPromoCampaignCategory.CORPORATE });

    this.applyFilters(queryBuilder, dto);
    this.applyOrdering(queryBuilder, dto);
    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<PromoCampaign>,
    dto: GetAllPersonalPromoCampaignsDto | GetAllCorporatePromoCampaignsDto,
  ): void {
    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    if (dto.statuses?.length) {
      queryBuilder.andWhere("promoCampaign.status IN (:...statuses)", {
        statuses: dto.statuses,
      });
    }

    if (dto.discounts?.length) {
      queryBuilder.andWhere("promoCampaign.discount IN (:...discounts)", {
        discounts: dto.discounts,
      });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("promoCampaign.startDate BETWEEN :startDate AND :endDate", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    } else if (dto.startDate) {
      queryBuilder.andWhere("promoCampaign.startDate >= :startDate", { startDate: dto.startDate });
    } else if (dto.endDate) {
      queryBuilder.andWhere("promoCampaign.startDate <= :endDate", { endDate: dto.endDate });
    }
  }

  private applySearch(queryBuilder: SelectQueryBuilder<PromoCampaign>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("promoCampaign.name ILIKE :search", { search: searchTerm })
          .orWhere("promoCampaign.promoCode ILIKE :search", { search: searchTerm })
          .orWhere("company.name ILIKE :search", { search: searchTerm })
          .orWhere("CAST(promoCampaign.discount AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrdering(
    queryBuilder: SelectQueryBuilder<PromoCampaign>,
    dto: GetAllPersonalPromoCampaignsDto | GetAllCorporatePromoCampaignsDto,
  ): void {
    if (dto.statusOrder) {
      const caseStatement = generateCaseForEnumOrder("promoCampaign.status", promoCampaignStatusOrder);
      queryBuilder.addSelect(caseStatement, "status_order");
      queryBuilder.addOrderBy("status_order", dto.statusOrder);
    }

    if (dto.nameOrder) {
      queryBuilder.addOrderBy("promoCampaign.name", dto.nameOrder);
    }

    if (dto.promoCodeOrder) {
      queryBuilder.addOrderBy("promoCampaign.promoCode", dto.promoCodeOrder);
    }

    if (dto.discountOrder) {
      queryBuilder.addOrderBy("promoCampaign.discount", dto.discountOrder);
    }

    if (dto.periodOrder) {
      queryBuilder.addOrderBy("promoCampaign.startDate", dto.periodOrder);
      queryBuilder.addOrderBy("promoCampaign.endDate", dto.periodOrder);
    }
  }
}
