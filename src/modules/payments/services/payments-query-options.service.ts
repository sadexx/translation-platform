import { Injectable } from "@nestjs/common";
import { Brackets, SelectQueryBuilder } from "typeorm";
import { Payment } from "src/modules/payments/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { GetIndividualPaymentsDto } from "src/modules/payments/common/dto/get-individual-payments.dto";
import { EReceiptType, paymentMethodFilterMap, paymentStatusOrder } from "src/modules/payments/common/enums";
import { DUE_PAYMENT_STATUSES } from "src/common/constants";
import { generateCaseForEnumOrder } from "src/common/utils";

@Injectable()
export class PaymentsQueryOptionsService {
  constructor() {}

  public getIndividualPaymentsListOptions(
    queryBuilder: SelectQueryBuilder<Payment>,
    dto: GetIndividualPaymentsDto,
    user: ITokenUserData,
  ): void {
    queryBuilder
      .select([
        "payment.id",
        "payment.platformId",
        "payment.totalFullAmount",
        "payment.totalGstAmount",
        "payment.currency",
        "payment.paymentMethodInfo",
        "payment.receipt",
        "payment.taxInvoice",
        "payment.note",
        "payment.isDepositCharge",
        "payment.membershipId",
        "payment.updatingDate",
      ])
      .leftJoin("payment.appointment", "appointment")
      .addSelect(["appointment.id", "appointment.platformId", "appointment.scheduledStartTime"])
      .leftJoin("payment.fromClient", "fromClient")
      .addSelect("fromClient.id")
      .leftJoin("fromClient.user", "user")
      .addSelect(["user.id", "user.platformId"])
      .leftJoin("payment.company", "company")
      .addSelect(["company.id", "company.platformId"])
      .leftJoin("payment.items", "item")
      .addSelect([
        "item.id",
        "item.amount",
        "item.gstAmount",
        "item.fullAmount",
        "item.currency",
        "item.status",
        "item.receipt",
        "item.note",
        "item.creationDate",
        "item.updatingDate",
      ])
      .andWhere("(payment.fromClientId = :userRoleId OR payment.toInterpreterId = :userRoleId)", {
        userRoleId: user.userRoleId,
      });

    if (dto.receiptType === EReceiptType.TAX_INVOICE) {
      queryBuilder.andWhere("payment.totalGstAmount > 0");
    }

    this.applyFiltersForUserPayments(queryBuilder, dto);
    this.applyOrderingForUserPayments(queryBuilder, dto);
    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  public applyFiltersForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, dto: GetIndividualPaymentsDto): void {
    if (dto.searchField) {
      this.applySearchForUserPayments(queryBuilder, dto.searchField);
    }

    if (dto.paymentMethod) {
      const paymentMethod = paymentMethodFilterMap[dto.paymentMethod];
      queryBuilder.andWhere("payment.paymentMethodInfo LIKE :paymentMethod", {
        paymentMethod: `%${paymentMethod}%`,
      });
    }

    if (dto.statuses?.length) {
      const lastStatusCase = `
      (SELECT item.status
        FROM payment_items item
        WHERE item.payment_id = payment.id
        ORDER BY item.updating_date DESC
        LIMIT 1)
      `;
      queryBuilder.andWhere(`${lastStatusCase} IN (:...statuses)`, { statuses: dto.statuses });
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

  private applySearchForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("company.platformId ILIKE :search", { search: searchTerm })
          .orWhere("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(payment.totalFullAmount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(payment.totalGstAmount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(item.status AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  public applyOrderingForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, dto: GetIndividualPaymentsDto): void {
    if (dto.sortOrder) {
      queryBuilder.addOrderBy("payment.updatingDate", dto.sortOrder);
    }

    if (dto.appointmentDateOrder) {
      queryBuilder.addOrderBy("appointment.scheduledStartTime", dto.appointmentDateOrder);
    }

    if (dto.amountOrder) {
      const orderField =
        dto.receiptType === EReceiptType.TAX_INVOICE ? "payment.totalGstAmount" : "payment.totalFullAmount";
      queryBuilder.addOrderBy(orderField, dto.amountOrder);
    }

    if (dto.dueDateOrder) {
      const lastDueItemDateCase = `
      (SELECT item.updating_date
        FROM payment_items item
        WHERE item.payment_id = payment.id
          AND item.status IN (:...dueStatuses)
        ORDER BY item.updatingDate DESC
        LIMIT 1)
      `;
      queryBuilder.addSelect(lastDueItemDateCase, "due_date_order");
      queryBuilder.addOrderBy("due_date_order", dto.dueDateOrder);
      queryBuilder.setParameter("dueStatuses", DUE_PAYMENT_STATUSES);
    }

    if (dto.statusOrder) {
      const lastStatusSQL = `
      (SELECT item.status
        FROM payment_items item
        WHERE item.payment_id = payment.id
        ORDER BY item.updating_date DESC
        LIMIT 1)
      `;
      const caseStatement = generateCaseForEnumOrder(lastStatusSQL, paymentStatusOrder);
      queryBuilder.addSelect(caseStatement, "item_status_order");
      queryBuilder.addOrderBy("item_status_order", dto.statusOrder);
    }

    if (dto.invoiceNumberOrder) {
      const invoiceNumberCase = `
        CASE
          WHEN payment.membershipId IS NOT NULL AND payment.fromClient IS NOT NULL
            THEN CONCAT(user.platform_id, '-', payment.platform_id)
          WHEN payment.isDepositCharge = true AND company.id IS NOT NULL
            THEN CONCAT(company.platform_id, '-', payment.platform_id)
          ELSE appointment.platform_id
        END
      `;
      queryBuilder.addSelect(invoiceNumberCase, "invoice_number_order");
      queryBuilder.addOrderBy("invoice_number_order", dto.invoiceNumberOrder);
    }
  }
}
