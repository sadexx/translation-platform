import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import {
  ECurrencies,
  ECustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
} from "src/modules/payments/common/enums";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { Company } from "src/modules/companies/entities";
import { StripeService } from "src/modules/stripe/services";
import { denormalizedAmountToNormalized } from "src/common/utils";
import Stripe from "stripe";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { FIFTEEN_PERCENT_MULTIPLIER, TEN_PERCENT_MULTIPLIER } from "src/common/constants";
import { EmailsService } from "src/modules/emails/services";
import { CompanyIdOptionalDto } from "src/modules/companies/common/dto";
import { HelperService } from "src/modules/helper/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UNFINISHED_DEPOSIT_CHARGE_STATUSES } from "src/modules/payments/common/constants/constants";

@Injectable()
export class CompaniesDepositChargeService {
  private readonly lokiLogger = new LokiLogger(CompaniesDepositChargeService.name);

  public constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyDepositCharge)
    private readonly companyDepositChargeRepository: Repository<CompanyDepositCharge>,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
  ) {}

  public async createChargeRequest(user: ITokenUserData, dto: CompanyIdOptionalDto): Promise<void> {
    const company = await this.helperService.getCompanyByRole(user, { abnCheck: true }, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    if (!company.depositDefaultChargeAmount) {
      throw new BadRequestException("Default deposit charge amount not filled");
    }

    const tenPercentFromDepositDefaultChargeAmount: number =
      company.depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;

    if (company.depositAmount && company.depositAmount >= tenPercentFromDepositDefaultChargeAmount) {
      throw new BadRequestException("Deposit amount more than minimum limit (10%)");
    }

    await this.createOrUpdateDepositCharge(company, company.depositDefaultChargeAmount);
  }

  public async createOrUpdateDepositCharge(company: Company, depositDefaultChargeAmount: number): Promise<void> {
    const existedDepositCharge = await this.companyDepositChargeRepository.exists({
      where: { company: { id: company.id } },
    });

    let chargeAmount: number = depositDefaultChargeAmount;

    if (company.depositAmount && company.depositAmount > 0) {
      chargeAmount = depositDefaultChargeAmount - company.depositAmount;
    }

    if (chargeAmount <= 0) {
      return;
    }

    if (existedDepositCharge) {
      if (company.isActive) {
        throw new BadRequestException("Deposit charge request cannot be changed before execution!");
      } else {
        await this.companyDepositChargeRepository.update(
          { company: { id: company.id } },
          { depositChargeAmount: chargeAmount },
        );

        await this.updateCompanyDepositDefaultChargeAmountValue(company, depositDefaultChargeAmount);
      }
    } else {
      const companyDepositCharge = this.companyDepositChargeRepository.create({
        depositChargeAmount: chargeAmount,
        company: company,
      });

      await this.companyDepositChargeRepository.save(companyDepositCharge);

      await this.updateCompanyDepositDefaultChargeAmountValue(company, depositDefaultChargeAmount);
    }
  }

  public async chargeCompaniesDeposit(): Promise<void> {
    const depositCharges = await this.companyDepositChargeRepository.find({
      where: { company: { isActive: true } },
      relations: { company: { paymentInformation: true } },
    });

    for (const depositCharge of depositCharges) {
      this.chargeCompanyDeposit(depositCharge).catch((error: Error) => {
        this.lokiLogger.error(`Error in chargeCompanies: ${error.message}`);
      });
    }
  }

  public async chargeCompanyDeposit(
    depositCharge: CompanyDepositCharge,
    currency: ECurrencies = ECurrencies.AUD,
  ): Promise<void> {
    const company = depositCharge.company;

    const payments = await this.paymentRepository.find({
      where: {
        companyId: company.id,
        direction: EPaymentDirection.INCOMING,
        isDepositCharge: true,
        items: {
          status: In(UNFINISHED_DEPOSIT_CHARGE_STATUSES),
        },
      },
      relations: { items: true },
    });

    let isUnfinishedPaymentExist = false;

    for (const payment of payments) {
      if (payment.items && payment.items.length > 0) {
        const unfinishedItemsCount = payment.items.length;

        if (unfinishedItemsCount !== 0) {
          isUnfinishedPaymentExist = true;
        }
      }
    }

    if (isUnfinishedPaymentExist) {
      throw new BadRequestException("Unfinished deposit charge exist!");
    }

    if (!company.paymentInformation) {
      this.sendDepositChargeFailedNotification(company, EPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Payment info not filled!");
    }

    if (
      !company.paymentInformation.stripeClientPaymentMethodId ||
      !company.paymentInformation.stripeClientAccountId ||
      !company.paymentInformation.stripeClientLastFour
    ) {
      this.sendDepositChargeFailedNotification(company, EPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Stripe payment info not filled!");
    }

    if (!company.adminEmail) {
      this.sendDepositChargeFailedNotification(company, EPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Company admin email not fill!");
    }

    let depositDefaultChargeAmount = company.depositDefaultChargeAmount;

    if (!depositDefaultChargeAmount) {
      depositDefaultChargeAmount = depositCharge.depositChargeAmount;
    }

    const tenPercentFromDepositDefaultChargeAmount: number = depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;
    const fifteenPercentFromDepositDefaultChargeAmount: number =
      depositDefaultChargeAmount * FIFTEEN_PERCENT_MULTIPLIER;

    if (company.depositAmount && company.depositAmount >= fifteenPercentFromDepositDefaultChargeAmount) {
      await this.companyDepositChargeRepository.delete({ id: depositCharge.id });

      return;
    }

    if (company.depositAmount && company.depositAmount >= tenPercentFromDepositDefaultChargeAmount) {
      await this.companyDepositChargeRepository.delete({ id: depositCharge.id });

      await this.emailsService.sendDepositLowBalanceNotification(company.contactEmail, {
        platformId: company.platformId,
      });

      return;
    }

    let paymentIntent;
    let paymentStatus = EPaymentStatus.DEPOSIT_PAYMENT_REQUEST_INITIALIZING;
    let paymentNote: string | null | undefined = "Deposit charge";
    const amount = depositCharge.depositChargeAmount;

    if (amount > 0) {
      try {
        paymentIntent = await this.stripeService.chargeByBECSDebit(
          denormalizedAmountToNormalized(Number(amount)),
          currency,
          company.paymentInformation.stripeClientPaymentMethodId,
          company.paymentInformation.stripeClientAccountId,
          company.platformId,
        );

        if (paymentIntent.next_action) {
          this.lokiLogger.warn(`STRIPE DEPOSIT CHARGE, REQUIRED NEXT ACTION, company id: ${company.id}`);
        } // TODO R check
      } catch (error) {
        paymentStatus = EPaymentStatus.AUTHORIZATION_FAILED;
        paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
      }
    }

    const newPayment = this.paymentRepository.create({
      direction: EPaymentDirection.INCOMING,
      customerType: ECustomerType.CORPORATE,
      system: EPaymentSystem.STRIPE,
      totalAmount: amount,
      totalGstAmount: 0,
      totalFullAmount: amount,
      currency,
      company: company,
      note: paymentNote,
      paymentMethodInfo: `Bank Account ${company.paymentInformation.stripeClientLastFour}`,
      isDepositCharge: true,
    });

    const payment = await this.paymentRepository.save(newPayment);

    const paymentItem = this.paymentItemRepository.create({
      payment,
      externalId: paymentIntent?.id,
      amount,
      gstAmount: 0,
      fullAmount: amount,
      currency,
      status: paymentStatus,
      note: paymentNote,
    });

    await this.paymentItemRepository.save(paymentItem);

    if (paymentStatus === EPaymentStatus.AUTHORIZATION_FAILED) {
      await this.companyDepositChargeRepository.delete({ id: depositCharge.id });

      await this.emailsService.sendDepositChargeFailedNotification(company.contactEmail, {
        platformId: company.platformId,
      });

      this.sendDepositChargeFailedNotification(company, EPaymentFailedReason.DEPOSIT_CHARGE_FAILED);

      throw new UnprocessableEntityException(paymentNote);
    }

    await this.companyDepositChargeRepository.delete({ id: depositCharge.id });
  }

  /*
   * Helpers
   */

  private sendDepositChargeFailedNotification(company: Company, reason: EPaymentFailedReason): void {
    this.notificationService
      .sendDepositChargeFailedNotification(company.superAdminId, company.platformId, reason, {
        companyId: company.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send deposit charge failed notification for userRoleId: ${company.superAdminId}`,
          error.stack,
        );
      });
  }

  private async updateCompanyDepositDefaultChargeAmountValue(
    company: Company,
    depositDefaultChargeAmount: number,
  ): Promise<void> {
    if (
      !company.depositDefaultChargeAmount ||
      (company.depositDefaultChargeAmount && company.depositDefaultChargeAmount !== depositDefaultChargeAmount)
    ) {
      await this.companyRepository.update({ id: company.id }, { depositDefaultChargeAmount });
    }
  }
}
