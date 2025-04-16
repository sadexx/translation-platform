import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { StripeService } from "src/modules/stripe/services";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import {
  ECurrencies,
  ECustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EStripeInterpreterPayoutType,
} from "src/modules/payments/common/enums";
import { denormalizedAmountToNormalized, findOneOrFail } from "src/common/utils";
import { PdfBuilderService } from "src/modules/pdf/services";
import { Appointment } from "src/modules/appointments/entities";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";
import { ITransferReturnedInfo } from "src/modules/payments/common/interfaces";
import { PaypalSdkService } from "src/modules/paypal/services";
import { IPayoutResponse } from "src/modules/paypal/common/interfaces";
import { ConfigService } from "@nestjs/config";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { ICreateTransfer } from "src/modules/payments/common/interfaces/create-transfer.interface";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";

@Injectable()
export class IndividualPaymentsService {
  private readonly lokiLogger = new LokiLogger(IndividualPaymentsService.name);
  private readonly BACK_END_URL: string;

  public constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,
    private readonly stripeService: StripeService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("backEndUrl");
  }

  /*
   * Individual client, pay in, stripe
   */

  /**
   * Authorizes a payment for a specific appointment by interacting with the Stripe service.
   *
   * @param {number} amount - The payment amount, denormalized (e.g., 2.25).
   * @param {number} gstAmount - The GST (Goods and Services Tax) amount for the payment, denormalized (e.g., 0.25).
   * @param {string} appointmentId - The unique identifier of the appointment for which the payment is being authorized.
   * @param discounts
   * @param discountByPercent
   * @param discountByFreeMinutes
   * @param {ECurrencies} [currency=ECurrencies.AUD] - The currency of the payment (default is AUD).
   * @returns {Promise<void>} - A promise that resolves when the payment authorization process completes or rejects with an exception if an error occurs.
   *
   * @example
   * await authorizePayment(2.25, 0.25, "0470e502-fe0e-497d-9ddc-79862101b5bb", ECurrencies.USD);
   */
  public async authorizePayment(
    amount: number,
    gstAmount: number,
    appointmentId: string,
    discounts: IDiscountRate | void,
    discountByMembershipMinutes: number,
    discountByMembershipDiscount: number,
    discountByPromoCode: number,
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

    if (payment && payment.items && payment.items.length > 0) {
      const capturedItemsCount = payment.items.filter((item) => item.status === EPaymentStatus.CAPTURED).length;

      if (capturedItemsCount > 0) {
        throw new BadRequestException("Payment already captured!");
      }
    }

    if (!appointment.client.paymentInformation) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);
      this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Payment info not filled!");
    }

    if (
      !appointment.client.paymentInformation.stripeClientPaymentMethodId ||
      !appointment.client.paymentInformation.stripeClientAccountId
    ) {
      await this.changeAppointmentStatusToCancelledBySystem(appointment.id);
      this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.INFO_NOT_FILLED);
      throw new BadRequestException("Stripe payment info not filled!");
    }

    let paymentIntent;
    let paymentStatus = EPaymentStatus.AUTHORIZED;
    let paymentNote: string | null | undefined = null;

    if (amount > 0) {
      try {
        paymentIntent = await this.stripeService.authorizePayment(
          denormalizedAmountToNormalized(Number(amount) + Number(gstAmount)),
          currency,
          appointment.client.paymentInformation.stripeClientPaymentMethodId,
          appointment.client.paymentInformation.stripeClientAccountId,
          appointment.platformId,
        );

        if (paymentIntent.next_action) {
          this.lokiLogger.warn(`STRIPE AUTHORIZE, REQUIRED NEXT ACTION, appointment id: ${appointmentId}`);
        } // TODO check
      } catch (error) {
        paymentStatus = EPaymentStatus.AUTHORIZATION_FAILED;
        paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
      }
    }

    const paymentMethodInfo = `Credit Card ${appointment.client.paymentInformation.stripeClientLastFour}`;

    if (!payment) {
      const newPayment = this.paymentRepository.create({
        direction: EPaymentDirection.INCOMING,
        customerType: ECustomerType.INDIVIDUAL,
        fromClient: appointment.client,
        appointment,
        system: EPaymentSystem.STRIPE,
        totalAmount: amount,
        totalGstAmount: gstAmount,
        totalFullAmount: amount + gstAmount,
        currency,
        paymentMethodInfo,
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
      externalId: paymentIntent?.id,
      amount,
      gstAmount,
      fullAmount: amount + gstAmount,
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

      this.sendPaymentFailedNotification(appointment, EPaymentFailedReason.AUTH_FAILED);

      throw new UnprocessableEntityException(paymentNote);
      // TODO: if this is group appointment -- cancel auth in other appointment
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

    if (payment.system !== EPaymentSystem.STRIPE) {
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

    let paymentStatus = EPaymentStatus.CAPTURED;

    for (const paymentItem of payment.items) {
      if (paymentItem.status !== EPaymentStatus.AUTHORIZED && !isSecondAttempt) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: EPaymentStatus.CAPTURE_FAILED },
        );
        continue;
      }

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

      if (!paymentItem.externalId && paymentItem.fullAmount > 0) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Payment externalId not fill!", status: EPaymentStatus.CAPTURE_FAILED },
        );
        continue;
      }

      try {
        if (paymentItem.fullAmount > 0 && paymentItem.externalId) {
          const paymentIntent = await this.stripeService.capturePayment(paymentItem.externalId);

          await this.paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CAPTURED });

          if (!paymentIntent.latest_charge) {
            await this.paymentItemRepository.update({ id: paymentItem.id }, { note: "Receipt download failed" });
            continue;
          }

          const stripeReceipt = await this.stripeService.getReceipt(paymentIntent.latest_charge as string);
          const key = `payments/stripe-receipts/${randomUUID()}.html`;

          await this.awsS3Service.uploadObject(key, stripeReceipt as ReadableStream, "text/html");

          await this.paymentItemRepository.update({ id: paymentItem.id }, { receipt: key });
        } else {
          await this.paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CAPTURED });
        }
      } catch (error) {
        paymentStatus = EPaymentStatus.CAPTURE_FAILED;
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: (error as Stripe.Response<Stripe.StripeRawError>).message ?? null,
            status: EPaymentStatus.CAPTURE_FAILED,
          },
        );
        continue;
      }
    }

    if (paymentStatus === EPaymentStatus.CAPTURED) {
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
  }

  public async cancelAuthorization(appointmentId: string): Promise<void> {
    const payment = await findOneOrFail(
      appointmentId,
      this.paymentRepository,
      {
        where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.STRIPE) {
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

      if (!paymentItem.externalId && paymentItem.fullAmount > 0) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Payment externalId not fill!", status: EPaymentStatus.CANCEL_FAILED },
        );
        continue;
      }

      try {
        if (paymentItem.fullAmount > 0 && paymentItem.externalId) {
          await this.stripeService.cancelAuthorization(paymentItem.externalId);
        }

        await this.paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CANCELED });
      } catch (error) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: (error as Stripe.Response<Stripe.StripeRawError>).message ?? null,
            status: EPaymentStatus.CANCEL_FAILED,
          },
        );
        continue;
      }
    }
  }

  /*
   * Individual interpreter, pay out, stripe
   */

  private async createTransferByStripe(
    fullAmount: number,
    currency: ECurrencies,
    stripeInterpreterAccountId: string | null,
  ): Promise<ICreateTransfer> {
    if (!stripeInterpreterAccountId) {
      throw new BadRequestException("Stripe payment info not filled!");
    }

    let transfer: Stripe.Response<Stripe.Transfer> | null = null;
    let paymentStatus: EPaymentStatus = EPaymentStatus.TRANSFERED;
    let paymentNote: string | null | undefined = null;

    try {
      transfer = await this.stripeService.createTransfer(fullAmount, currency, stripeInterpreterAccountId);
    } catch (error) {
      paymentStatus = EPaymentStatus.TRANSFER_FAILED;
      paymentNote = (error as Stripe.Response<Stripe.StripeRawError>).message ?? null;
    }

    return {
      transferId: transfer?.id,
      paymentStatus,
      paymentNote,
    };
  }

  private async createPayoutByStripe(appointment: Appointment, isSecondAttempt: boolean): Promise<void> {
    const payment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: EPaymentDirection.OUTCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (payment.system !== EPaymentSystem.STRIPE) {
      throw new BadRequestException("Incorrect payment system!");
    }

    if (payment.direction !== EPaymentDirection.OUTCOMING) {
      throw new BadRequestException("Incorrect payment direction!");
    }

    if (!appointment.interpreter) {
      throw new BadRequestException("Interpreter not exist!");
    }

    if (!appointment.interpreter.profile) {
      throw new BadRequestException("Interpreter profile not fill!");
    }

    if (!appointment.interpreter.profile.contactEmail) {
      throw new BadRequestException("Interpreter contact email not fill!");
    }

    if (!appointment.interpreter.paymentInformation) {
      throw new BadRequestException("Payment info not filled!");
    }

    if (!appointment.interpreter.paymentInformation.stripeInterpreterAccountId) {
      throw new BadRequestException("Stripe payment info not filled!");
    }

    if (
      !appointment.interpreter.paymentInformation.stripeInterpreterCardId ||
      !appointment.interpreter.paymentInformation.stripeInterpreterCardBrand ||
      !appointment.interpreter.paymentInformation.stripeInterpreterCardLast4
    ) {
      throw new BadRequestException("Stripe card payment info not filled!");
    }

    for (const paymentItem of payment.items) {
      if (paymentItem.status !== EPaymentStatus.TRANSFERED && !isSecondAttempt) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: EPaymentStatus.PAYOUT_FAILED },
        );
      }

      if (
        paymentItem.status !== EPaymentStatus.TRANSFERED &&
        paymentItem.status !== EPaymentStatus.PAYOUT_FAILED &&
        isSecondAttempt
      ) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { note: "Incorrect payment status!", status: EPaymentStatus.PAYOUT_FAILED },
        );
      }

      try {
        const payout = await this.stripeService.createPayout(
          payment.totalAmount,
          payment.currency,
          appointment.interpreter.paymentInformation.stripeInterpreterAccountId,
        );

        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          { status: EPaymentStatus.PAYOUT_SUCCESS, externalId: payout.id },
        );

        // TODO: check stripe payout receipt, if exist -- save
      } catch (error) {
        await this.paymentItemRepository.update(
          { id: paymentItem.id },
          {
            note: (error as Stripe.Response<Stripe.StripeRawError>).message ?? null,
            status: EPaymentStatus.PAYOUT_FAILED,
          },
        );
      }
    }
  }

  /*
   * Individual interpreter, pay out, paypal
   */

  private async createTransferByPaypal(
    fullAmount: number,
    currency: ECurrencies,
    paypalPayerId: string | null,
    appointmentPlatformId: string,
  ): Promise<ICreateTransfer> {
    if (!paypalPayerId) {
      throw new BadRequestException("Stripe payment info not filled!");
    }

    let transfer: IPayoutResponse | null = null;
    let paymentStatus: EPaymentStatus = EPaymentStatus.TRANSFERED;
    let paymentNote: string | null | undefined = null;

    try {
      transfer = await this.paypalSdkService.makeTransfer(
        paypalPayerId,
        String(fullAmount),
        appointmentPlatformId,
        currency,
      );
    } catch (error) {
      paymentStatus = EPaymentStatus.TRANSFER_FAILED;
      paymentNote = (error as Error).message ?? null;
    }

    return {
      transferId: transfer?.batch_header?.payout_batch_id,
      paymentStatus,
      paymentNote,
    };
  }

  /*
   * General Payout
   */

  /**
   * Processes a transfer and payout for an interpreter associated with a specific appointment.
   *
   * @param {number} amount - The payment amount, denormalized (e.g., 2.25).
   * @param {number} gstAmount - The GST (Goods and Services Tax) amount for the payment, denormalized (e.g., 0.25).
   * @param appointment
   * @param isSecondAttempt
   * @param {ECurrencies} [currency=ECurrencies.AUD] - The currency of the payment (default is AUD).
   * @returns {Promise<void>} - A promise that resolves when the transfer and payout process is completed successfully, or rejects with an exception if an error occurs.
   *
   * @example
   * await makeTransferAndPayout(2.25, 0.25, "0470e502-fe0e-497d-9ddc-79862101b5bb", ECurrencies.USD);
   */
  public async makeTransferAndPayout(
    amount: number,
    gstAmount: number,
    appointment: Appointment,
    isSecondAttempt: boolean,
    currency: ECurrencies = ECurrencies.AUD,
  ): Promise<void> {
    const interpreterPaymentInfo = await this.createTransfer(amount, gstAmount, appointment, isSecondAttempt, currency);

    if (
      interpreterPaymentInfo.paymentInfo.interpreterSystemForPayout === EPaymentSystem.STRIPE &&
      interpreterPaymentInfo.paymentInfo.stripeInterpreterCardId &&
      interpreterPaymentInfo.paymentInfo.stripeInterpreterCardLast4
    ) {
      await this.createPayoutByStripe(appointment, isSecondAttempt);
    }

    await this.appointmentRepository.update(
      { id: appointment.id },
      { receivedByInterpreter: amount + gstAmount, interpreterCurrency: currency },
    );

    const receipt = await this.pdfBuilderService.generatePayOutReceipt(interpreterPaymentInfo.payment.id);

    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receipt.receiptKey}`;

    await this.emailsService.sendOutgoingPaymentReceipt(
      interpreterPaymentInfo.profile.contactEmail,
      receiptLink,
      receipt.receiptData,
    );

    let taxInvoiceReceiptKey: string | null = null;

    if (gstAmount !== 0) {
      const taxInvoice = await this.pdfBuilderService.generateTaxInvoiceReceipt(interpreterPaymentInfo.payment.id);

      taxInvoiceReceiptKey = taxInvoice.receiptKey;

      const taxInvoiceLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${taxInvoice.receiptKey}`;

      await this.emailsService.sendTaxInvoicePaymentReceipt(
        interpreterPaymentInfo.profile.contactEmail,
        taxInvoiceLink,
        taxInvoice.receiptData,
      );
    }

    await this.paymentRepository.update(
      { id: interpreterPaymentInfo.payment.id },
      {
        receipt: receipt.receiptKey,
        taxInvoice: taxInvoiceReceiptKey,
      },
    );
  }

  /**
   * Creates a payment transfer to the interpreter associated with a specific appointment.
   *
   * @param {number} amount - The transfer amount, denormalized (e.g., 2.25).
   * @param {number} gstAmount - The GST (Goods and Services Tax) amount for the transfer, denormalized (e.g., 0.25).
   * @param {string} appointment - The appointment for which the transfer is being created.
   * @param {ECurrencies} [currency=ECurrencies.AUD] - The currency of the transfer (default is AUD).
   * @param isSecondAttempt
   * @returns {Promise<{ paymentInfo: PaymentInformation; payment: Payment; profile: UserProfile }>}
   *
   * @example
   * const result = await createTransfer(2.25, 0.25, "0470e502-fe0e-497d-9ddc-79862101b5bb", ECurrencies.USD);
   */
  private async createTransfer(
    amount: number,
    gstAmount: number,
    appointment: Appointment,
    isSecondAttempt: boolean,
    currency: ECurrencies = ECurrencies.AUD,
  ): Promise<ITransferReturnedInfo> {
    const incomingPayment = await findOneOrFail(
      appointment.id,
      this.paymentRepository,
      {
        where: { appointment: { id: appointment.id }, direction: EPaymentDirection.INCOMING },
        relations: { items: true },
      },
      "appointment.id",
    );

    if (incomingPayment.items.length <= 0) {
      throw new BadRequestException("Incoming Payment not have items");
    }

    for (const paymentItem of incomingPayment.items) {
      if (paymentItem.status !== EPaymentStatus.CAPTURED) {
        throw new BadRequestException(`One of Incoming Payment items have incorrect status (${paymentItem.status})`);
      }
    }

    const existedOutcomingPayment = await this.paymentRepository.findOne({
      where: { appointment: { id: appointment.id }, direction: EPaymentDirection.OUTCOMING },
      relations: { items: true },
    });

    if (existedOutcomingPayment && !isSecondAttempt) {
      throw new BadRequestException("Outcoming Payment already exist!");
    }

    if (!appointment.interpreter) {
      throw new BadRequestException("User role not exist!");
    }

    if (!appointment.interpreter.paymentInformation) {
      throw new BadRequestException("Payment info not filled!");
    }

    if (!appointment.interpreter.paymentInformation.interpreterSystemForPayout) {
      throw new BadRequestException("Payment info not filled!");
    }

    const fullAmount = amount + gstAmount;

    let transferResult: ICreateTransfer | null = null;

    let paymentMethodInfo: string = "";

    if (appointment.interpreter.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE) {
      transferResult = await this.createTransferByStripe(
        denormalizedAmountToNormalized(fullAmount),
        currency,
        appointment.interpreter.paymentInformation.stripeInterpreterAccountId,
      );

      if (
        appointment.interpreter.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE &&
        appointment.interpreter.paymentInformation.stripeInterpreterCardId &&
        appointment.interpreter.paymentInformation.stripeInterpreterCardLast4
      ) {
        paymentMethodInfo = `Credit Card ${appointment.interpreter.paymentInformation.stripeInterpreterCardLast4}`;
      } else {
        paymentMethodInfo = `Bank Account ${appointment.interpreter.paymentInformation.stripeInterpreterBankAccountLast4}`;
      }
    } else {
      transferResult = await this.createTransferByPaypal(
        fullAmount,
        currency,
        appointment.interpreter.paymentInformation.paypalPayerId,
        appointment.platformId,
      );

      paymentMethodInfo = `Paypal Account ${appointment.interpreter.paymentInformation.paypalEmail}`;
    }

    let payment: Payment | null = existedOutcomingPayment;

    if (!payment) {
      const newPayment = this.paymentRepository.create({
        direction: EPaymentDirection.OUTCOMING,
        toInterpreter: appointment.interpreter,
        appointment,
        system: appointment.interpreter.paymentInformation.interpreterSystemForPayout,
        totalAmount: amount,
        totalGstAmount: gstAmount,
        totalFullAmount: fullAmount,
        currency,
        stripeInterpreterPayoutType: EStripeInterpreterPayoutType.INTERNAL,
        paymentMethodInfo,
      });

      payment = await this.paymentRepository.save(newPayment);
    }

    const paymentItem = this.paymentItemRepository.create({
      payment,
      transferId: transferResult?.transferId,
      amount,
      gstAmount,
      fullAmount: amount + gstAmount,
      currency,
      status: transferResult.paymentStatus,
      note: transferResult.paymentNote,
    });

    await this.paymentItemRepository.save(paymentItem);

    if (transferResult.paymentStatus !== EPaymentStatus.TRANSFERED) {
      throw new UnprocessableEntityException(transferResult.paymentNote);
    }

    return {
      paymentInfo: appointment.interpreter.paymentInformation,
      payment,
      profile: appointment.interpreter.profile,
    };
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
}
