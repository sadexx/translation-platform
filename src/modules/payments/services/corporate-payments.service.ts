import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import {
  ECurrencies,
  ECustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
} from "src/modules/payments/common/enums";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import { findOneOrFail } from "src/common/utils";
import { Appointment } from "src/modules/appointments/entities";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { Repository } from "typeorm";
import { PdfBuilderService } from "src/modules/pdf/services";
import { EmailsService } from "src/modules/emails/services";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "src/modules/notifications/services";
import { Company } from "src/modules/companies/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { round2 } from "src/common/utils";
import { FIFTEEN_PERCENT_MULTIPLIER, TEN_PERCENT_MULTIPLIER } from "src/common/constants";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";

@Injectable()
export class CorporatePaymentsService {
  private readonly lokiLogger = new LokiLogger(CorporatePaymentsService.name);
  private readonly BACK_END_URL: string;

  public constructor(
    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly emailsService: EmailsService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly companiesDepositChargeService: CompaniesDepositChargeService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("backEndUrl");
  }

  /*
   * Corporate client, pay in, deposit
   */

  public async chargeFromDeposit(
    amount: number,
    gstAmount: number,
    appointmentId: string,
    discounts: IDiscountRate | void,
    discountByMembershipMinutes: number,
    discountByMembershipDiscount: number,
    discountByPromoCode: number,
    company: Company,
    currency: ECurrencies = ECurrencies.AUD,
  ): Promise<void> {
    let payment: Payment | null = await this.paymentRepository.findOne({
      where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
      relations: { items: true },
    });

    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, {
      where: { id: appointmentId },
      relations: {
        client: {
          paymentInformation: true,
        },
        interpreter: true,
      },
    });

    if (!appointment.client) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);
      throw new BadRequestException("User role not exist!");
    }

    let paymentStatus = EPaymentStatus.AUTHORIZED;
    let paymentNote: string | null | undefined = null;
    const fullAmount = amount + gstAmount;

    if (fullAmount > 0) {
      if (!company.depositAmount) {
        company.depositAmount = 0;
      }

      if (!company.depositDefaultChargeAmount) {
        company.depositDefaultChargeAmount = 0;
      }

      if (company.depositAmount < fullAmount) {
        paymentStatus = EPaymentStatus.AUTHORIZATION_FAILED;
        paymentNote = "Insufficient funds on deposit";
        // TODO R: ?
      } else {
        await this.chargeFromCompanyDeposit(
          company.id,
          company.depositAmount,
          company.depositDefaultChargeAmount,
          fullAmount,
          company.contactEmail,
          company.platformId,
        );
      }
    }

    if (!payment) {
      const newPayment = this.paymentRepository.create({
        direction: EPaymentDirection.INCOMING,
        customerType: ECustomerType.CORPORATE,
        fromClient: appointment.client,
        appointment,
        system: EPaymentSystem.DEPOSIT,
        totalAmount: amount,
        totalGstAmount: gstAmount,
        totalFullAmount: amount + gstAmount,
        currency,
        company,
        paymentMethodInfo: `Deposit of company ${company.platformId}`,
      });

      payment = await this.paymentRepository.save(newPayment);
    } else {
      if (payment.currency !== currency) {
        await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

        this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.INCORRECT_CURRENCY);

        throw new BadRequestException(
          "New payment item currency must been the same like other payment items currencies",
        );
      }
    }

    const paymentItem = this.paymentItemRepository.create({
      payment,
      amount,
      gstAmount,
      fullAmount,
      currency,
      status: paymentStatus,
      note: paymentNote,
      appliedPromoDiscountsPercent: discounts ? discounts.promoCampaignDiscount : null,
      appliedMembershipDiscountsPercent: discounts ? discounts.membershipDiscount : null,
      appliedPromoDiscountsMinutes: discounts ? discounts.promoCampaignDiscountMinutes : null,
      appliedMembershipFreeMinutes: discounts ? discounts.membershipFreeMinutes : null,
      appliedPromoCode: discounts ? discounts.promoCode : null,
      appliedMembershipType: discounts ? discounts.membershipType : null,
      amountOfAppliedDiscountByMembershipMinutes: discountByMembershipMinutes,
      amountOfAppliedDiscountByMembershipDiscount: discountByMembershipDiscount,
      amountOfAppliedDiscountByPromoCode: discountByPromoCode,
    });

    const newPaymentItem = await this.paymentItemRepository.save(paymentItem);

    if (!payment.items) {
      payment.items = [];
    }

    payment.items.push(newPaymentItem);

    if (payment.items && payment.items.length > 0) {
      const authorizedItemsCount = payment.items.filter((item) => item.status === EPaymentStatus.AUTHORIZED).length;

      if (authorizedItemsCount > 0) {
        let totalAmount = 0;
        let totalGstAmount = 0;
        let totalFullAmount = 0;

        for (const item of payment.items) {
          if (item.status === EPaymentStatus.AUTHORIZED) {
            totalAmount += Number(item.amount);
            totalGstAmount += Number(item.gstAmount);
            totalFullAmount += Number(item.fullAmount);
          }
        }

        await this.paymentRepository.update(
          { id: payment.id },
          {
            totalAmount,
            totalGstAmount,
            totalFullAmount,
          },
        );
      }
    }

    if (paymentStatus === EPaymentStatus.AUTHORIZATION_FAILED) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);

      await this.emailsService.sendDepositBalanceInsufficientFundNotification(company.contactEmail, {
        platformId: company.platformId,
      });

      this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.AUTH_FAILED);

      throw new UnprocessableEntityException(paymentNote);
    }

    this.sendPaymentSuccessNotification(appointment);
  }

  public async capturePayment(appointment: Appointment, isSecondAttempt: boolean = false): Promise<void> {
    const payment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: EPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.DEPOSIT) {
      throw new BadRequestException("Incorrect payment system!");
    }

    if (payment.direction !== EPaymentDirection.INCOMING) {
      throw new BadRequestException("Incorrect payment direction!");
    }

    if (!appointment.client) {
      throw new BadRequestException("Client not exist!");
    }

    if (!appointment.client.profile) {
      this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.PROFILE_NOT_FILLED);
      throw new BadRequestException("Client profile not fill!");
    }

    if (!appointment.client.profile.contactEmail) {
      this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.PROFILE_NOT_FILLED);
      throw new BadRequestException("Client contact email not fill!");
    }

    for (const paymentItem of payment.items) {
      if (
        paymentItem.status !== EPaymentStatus.AUTHORIZED &&
        isSecondAttempt &&
        paymentItem.status !== EPaymentStatus.CAPTURE_FAILED
      ) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: EPaymentStatus.CAPTURE_FAILED },
        );
        continue;
      }

      await this.paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CAPTURED });
    }

    const receipt = await this.pdfBuilderService.generatePayInReceipt(payment.id);

    await this.paymentRepository.update(
      { id: payment.id },
      {
        receipt: receipt.receiptKey,
      },
    );

    await this.appointmentRepository.update(
      { id: appointment.id },
      { paidByClient: payment.totalFullAmount, clientCurrency: payment.currency },
    );

    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receipt.receiptKey}`;

    await this.emailsService.sendIncomingPaymentReceipt(
      appointment.client.profile.contactEmail,
      receiptLink,
      receipt.receiptData,
    );
  }

  public async cancelAuthorization(appointmentId: string, company: Company): Promise<void> {
    const payment = await findOneOrFail(
      appointmentId,
      this.paymentRepository,
      {
        where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.DEPOSIT) {
      throw new BadRequestException("Incorrect payment system!");
    }

    if (payment.direction !== EPaymentDirection.INCOMING) {
      throw new BadRequestException("Incorrect payment direction!");
    }

    for (const paymentItem of payment.items) {
      if (paymentItem.status === EPaymentStatus.CANCELED) {
        continue;
      }

      if (paymentItem.status !== EPaymentStatus.AUTHORIZED) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: `Incorrect payment status! Previous status: ${paymentItem.status}`,
            status: EPaymentStatus.CANCEL_FAILED,
          },
        );
        continue;
      }

      if (!company.depositAmount) {
        company.depositAmount = 0;
      }

      if (paymentItem.fullAmount > 0) {
        await this.companyRepository.update(
          { id: company.id },
          { depositAmount: company.depositAmount + paymentItem.fullAmount },
        );
      }

      await this.paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CANCELED });
    }
  }

  /*
   * Helpers
   */

  private async changeAppointmentStatusToCancelledBySystem(appointmentId: string): Promise<void> {
    await this.appointmentRepository.update({ id: appointmentId }, { status: EAppointmentStatus.CANCELLED_BY_SYSTEM });
  }

  private sendPaymentFailedNotification(appointment: Appointment, reason: EPaymentFailedReason): void {
    this.notificationService
      .sendAppointmentPaymentFailedNotification(appointment.client!.id, appointment.platformId, reason, {
        appointmentId: appointment.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment failed notification for userRoleId: ${appointment?.client?.id}`,
          error.stack,
        );
      });
  }

  private sendPaymentSuccessNotification(appointment: Appointment): void {
    this.notificationService
      .sendAppointmentPaymentSucceededNotification(appointment.client!.id, appointment.platformId, {
        appointmentId: appointment.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment success notification for userRoleId: ${appointment?.client?.id}`,
          error.stack,
        );
      });
  }

  private async chargeFromCompanyDeposit(
    companyId: string,
    companyDepositAmount: number,
    depositDefaultChargeAmount: number,
    appointmentAmount: number,
    companyEmail: string,
    companyPlatformId: string,
  ): Promise<void> {
    const companyNewDepositAmount: number = companyDepositAmount - appointmentAmount;

    await this.companyRepository.update({ id: companyId }, { depositAmount: round2(companyNewDepositAmount) });

    if (depositDefaultChargeAmount <= 0) {
      return;
    }

    const tenPercentFromDepositDefaultChargeAmount: number = depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;

    if (companyNewDepositAmount <= tenPercentFromDepositDefaultChargeAmount) {
      const company = await findOneOrFail(companyId, this.companyRepository, { where: { id: companyId } });
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(company, depositDefaultChargeAmount);

      return;
    }

    const fifteenPercentFromDepositDefaultChargeAmount: number =
      depositDefaultChargeAmount * FIFTEEN_PERCENT_MULTIPLIER;

    if (companyNewDepositAmount <= fifteenPercentFromDepositDefaultChargeAmount) {
      await this.emailsService.sendDepositLowBalanceNotification(companyEmail, { platformId: companyPlatformId });

      return;
    }

    return;
  }
}
