import { BadRequestException, Injectable } from "@nestjs/common";
import { DownloadReceiptDto } from "src/modules/payments/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DeepPartial, FindOptionsWhere, In, Repository } from "typeorm";
import { IncomingPaymentsWaitList, Payment } from "src/modules/payments/entities";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import {
  IApplyDiscountByMembership,
  IApplyDiscountByMembershipAndPromo,
  IApplyDiscountByMinutes,
  IApplyDiscountByPromo,
  IApplyDiscounts,
  ICalculateAppointmentPrices,
  IGetIndividualPayment,
  IGetIndividualPaymentResponse,
  IIsGstPayers,
  IRedirectPaymentToWaitList,
} from "src/modules/payments/common/interfaces";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { Appointment } from "src/modules/appointments/entities";
import { RatesService } from "src/modules/rates/services";
import { findOneOrFail, round2 } from "src/common/utils";
import { UserRole } from "src/modules/users-roles/entities";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { EGstPayer } from "src/modules/abn/common/enums";
import { addMinutes, differenceInDays, format, subMilliseconds } from "date-fns";
import {
  ECurrencies,
  EPayInStatus,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EReceiptType,
  ERoleType,
} from "src/modules/payments/common/enums";
import { IndividualPaymentsService } from "src/modules/payments/services/individual-payments.service";
import {
  MIN_NUM_DAYS_BEFORE_APPOINTMENT_TO_PAY,
  MINUTES_BEFORE_START_AS_REASON_TO_CANCEL,
  PAYMENT_FRAMES,
} from "src/modules/payments/common/constants/constants";
import { HelperService } from "src/modules/helper/services";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { DiscountsService } from "src/modules/discounts/services";
import { LokiLogger } from "src/common/logger";
import { ILiveAppointmentCacheData } from "src/modules/appointments/common/interfaces";
import {
  CORPORATE_CLIENT_ROLES,
  DUE_PAYMENT_STATUSES,
  GST_COEFFICIENT,
  NUMBER_OF_MINUTES_IN_TEN_MINUTES,
  ONE_HUNDRED,
  TEN,
} from "src/common/constants";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointment-failed-payment-cancel/services";
import { NotificationService } from "src/modules/notifications/services";
import { MakeManualPayoutAttemptDto } from "src/modules/payments/common/dto/make-manual-payout-attempt.dto";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { PaymentsQueryOptionsService } from "src/modules/payments/services/payments-query-options.service";
import { CorporatePaymentsService } from "src/modules/payments/services/corporate-payments.service";
import { Company } from "src/modules/companies/entities";
import { ICalculatePrice } from "src/modules/rates/common/interfaces";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { GetIndividualPaymentsDto } from "src/modules/payments/common/dto/get-individual-payments.dto";

@Injectable()
export class GeneralPaymentsService {
  private readonly lokiLogger = new LokiLogger(GeneralPaymentsService.name);

  public constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(IncomingPaymentsWaitList)
    private readonly incomingPaymentWaitListRepository: Repository<IncomingPaymentsWaitList>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
    private readonly ratesService: RatesService,
    private readonly individualPaymentsService: IndividualPaymentsService,
    private readonly discountsService: DiscountsService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
    private readonly notificationService: NotificationService,
    private readonly paymentsQueryOptionsService: PaymentsQueryOptionsService,
    private readonly corporatePaymentsService: CorporatePaymentsService,
  ) {}

  public async makePayInAuth(
    appointment: Appointment,
    pricesOfAppointment?: ICalculateAppointmentPrices,
  ): Promise<EPayInStatus> {
    if (!appointment.clientId || !appointment.client) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      return EPayInStatus.INCORRECT_DATA;
    }

    const clientUserRole = await findOneOrFail(appointment.clientId, this.userRoleRepository, {
      where: { id: appointment.clientId },
      relations: { role: true },
    });

    let isCorporate: boolean = false;
    let company: Company | null = null;
    let country = clientUserRole.country;

    if (CORPORATE_CLIENT_ROLES.includes(clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(appointment.client.operatedByCompanyId, this.companyRepository, {
        where: { id: appointment.client.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;
    }

    if (!country) {
      throw new BadRequestException("Country not filled!");
    }

    const date = new Date(appointment.scheduledStartTime);

    if (!isCorporate) {
      const daysBeforeAppointment = differenceInDays(date, new Date());

      if (daysBeforeAppointment > MIN_NUM_DAYS_BEFORE_APPOINTMENT_TO_PAY) {
        await this.redirectPaymentToWaitList(appointment);

        await this.changeAppointmentStatusToPending(appointment.id);

        return EPayInStatus.REDIRECTED_TO_WAIT_LIST;
      }
    }

    if (!pricesOfAppointment) {
      pricesOfAppointment = await this.calculateAppointmentPrice(appointment, date, isCorporate, country);
    }

    if (isCorporate) {
      if (!company) {
        throw new BadRequestException("Company not found!");
      }

      await this.corporatePaymentsService.chargeFromDeposit(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        pricesOfAppointment.discounts,
        pricesOfAppointment.discountByMembershipMinutes,
        pricesOfAppointment.discountByMembershipDiscount,
        pricesOfAppointment.discountByPromoCode,
        company,
        ECurrencies.AUD,
      );
    } else {
      await this.individualPaymentsService.authorizePayment(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        pricesOfAppointment.discounts,
        pricesOfAppointment.discountByMembershipMinutes,
        pricesOfAppointment.discountByMembershipDiscount,
        pricesOfAppointment.discountByPromoCode,
        ECurrencies.AUD,
      );
    }

    await this.changeAppointmentStatusToPending(appointment.id);

    return EPayInStatus.AUTHORIZATION_SUCCESS;
  }

  public async redirectPaymentToWaitList(
    appointment: Appointment,
    isFirstAttemptFailed: boolean = false,
  ): Promise<IRedirectPaymentToWaitList> {
    const paymentWaitListRecord = await this.incomingPaymentWaitListRepository.findOne({
      where: { appointment: { id: appointment.id } },
    });

    if (new Date(appointment.scheduledStartTime) >= addMinutes(new Date(), MINUTES_BEFORE_START_AS_REASON_TO_CANCEL)) {
      if (paymentWaitListRecord) {
        await this.incomingPaymentWaitListRepository.delete({ id: paymentWaitListRecord.id });
      }

      return { isNeedToCancelAppointment: true };
    }

    if (!paymentWaitListRecord) {
      const newPaymentWaitListRecordData: DeepPartial<IncomingPaymentsWaitList> = {
        appointment,
      };

      if (isFirstAttemptFailed) {
        newPaymentWaitListRecordData.paymentAttemptCount = 1;
      }

      const newPaymentWaitListRecord = this.incomingPaymentWaitListRepository.create(newPaymentWaitListRecordData);

      await this.incomingPaymentWaitListRepository.save(newPaymentWaitListRecord);
    }

    return { isNeedToCancelAppointment: false };
  }

  public async makePayInAuthIfAppointmentRecreated(
    newAppointment: Appointment,
    oldAppointment: Appointment,
  ): Promise<EPayInStatus> {
    if (
      oldAppointment.id === newAppointment.id &&
      oldAppointment.schedulingDurationMin === newAppointment.schedulingDurationMin &&
      oldAppointment.topic === newAppointment.topic &&
      oldAppointment.scheduledStartTime === newAppointment.scheduledStartTime &&
      oldAppointment.interpretingType === newAppointment.interpretingType &&
      oldAppointment.schedulingType === newAppointment.schedulingType &&
      oldAppointment.interpreterType === newAppointment.interpreterType &&
      oldAppointment.communicationType === newAppointment.communicationType
    ) {
      return EPayInStatus.PAY_IN_NOT_CHANGED;
    }

    if (!newAppointment.clientId || !newAppointment.client) {
      this.lokiLogger.error(
        `Appointment with id ${newAppointment.id} does not have clientId (${newAppointment.clientId})`,
      );

      return EPayInStatus.INCORRECT_DATA;
    }

    const clientUserRole = await findOneOrFail(newAppointment.clientId, this.userRoleRepository, {
      where: { id: newAppointment.clientId },
      relations: { role: true },
    });

    const oldAppointmentPayment = await this.paymentRepository.findOne({
      where: { appointment: { id: oldAppointment.id }, direction: EPaymentDirection.INCOMING },
    });

    const date = new Date(newAppointment.scheduledStartTime);

    let isCorporate: boolean = false;
    let company: Company | null = null;
    let country = clientUserRole.country;

    if (CORPORATE_CLIENT_ROLES.includes(clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(newAppointment.client.operatedByCompanyId, this.companyRepository, {
        where: { id: newAppointment.client.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;
    }

    if (!country) {
      throw new BadRequestException("Country not filled!");
    }

    const pricesOfAppointment = await this.calculateAppointmentPrice(newAppointment, date, isCorporate, country);

    if (oldAppointmentPayment) {
      if (
        oldAppointmentPayment.totalAmount === pricesOfAppointment.amount &&
        oldAppointmentPayment.totalGstAmount === pricesOfAppointment.gstAmount
      ) {
        await this.paymentRepository.update({ id: oldAppointmentPayment.id }, { appointment: newAppointment });

        return EPayInStatus.PAY_IN_REATTACHED;
      } else {
        if (isCorporate) {
          if (!company) {
            throw new BadRequestException("Company not found.");
          }

          await this.corporatePaymentsService.cancelAuthorization(oldAppointment.id, company);
        } else {
          await this.individualPaymentsService.cancelAuthorization(oldAppointment.id);
        }
      }
    }

    return await this.makePayInAuth(newAppointment, pricesOfAppointment);
  }

  public async cancelPayInAuth(appointment: Appointment, isCancelByClient?: boolean): Promise<void> {
    const isRestricted = this.helperService.isAppointmentCancellationRestrictedByTimeLimits(appointment);

    if (!appointment.clientId || !appointment.client) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      throw new BadRequestException("Incorrect data");
    }

    const clientUserRole = await findOneOrFail(appointment.clientId, this.userRoleRepository, {
      where: { id: appointment.clientId },
      relations: { role: true },
    });

    let isCorporate: boolean = false;
    let company: Company | null = null;

    if (CORPORATE_CLIENT_ROLES.includes(clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(clientUserRole.operatedByCompanyId, this.companyRepository, {
        where: { id: clientUserRole.operatedByCompanyId },
        relations: { paymentInformation: true },
      });
    }

    if (isCancelByClient && isRestricted) {
      await this.paymentRepository.update(
        { appointment: { id: appointment.id }, direction: EPaymentDirection.INCOMING },
        {
          note: "Appointment cancelled by client less than 12 hours to appointment start date",
        },
      );

      await this.makePayInCaptureAndPayOut(appointment.id);

      return;
    }

    if (isCorporate) {
      if (!company) {
        throw new BadRequestException("Company not found.");
      }

      return await this.corporatePaymentsService.cancelAuthorization(appointment.id, company);
    } else {
      return await this.individualPaymentsService.cancelAuthorization(appointment.id);
    }
  }

  public async cancelPayInAuthForGroup(appointments: Appointment[]): Promise<void> {
    const appointmentIds = appointments.map((appointment) => appointment.id);

    const payments = await this.paymentRepository.find({
      where: { appointment: { id: In(appointmentIds) } },
      relations: { items: true },
      select: {
        id: true,
        appointment: { id: true, status: true, scheduledStartTime: true, communicationType: true, creationDate: true },
        items: { status: true },
      },
    });

    for (const payment of payments) {
      const isPaymentHaveAtLeastOneAuthorizedItem = payment.items.some(
        (item) => item.status === EPaymentStatus.AUTHORIZED,
      );

      if (isPaymentHaveAtLeastOneAuthorizedItem) {
        if (payment.appointment) {
          await this.cancelPayInAuth(payment.appointment);
        }
      }
    }
  }

  public async makePayInAuthByAdditionalBlock(
    liveAppointmentCacheData: ILiveAppointmentCacheData,
    additionalBlockDuration: number,
    discountMinutes: number,
  ): Promise<EPayInStatus> {
    const { appointment, extensionPeriodStart } = liveAppointmentCacheData;

    if (!appointment.clientId) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      return EPayInStatus.INCORRECT_DATA;
    }

    const clientUserRole = await findOneOrFail(appointment.clientId, this.userRoleRepository, {
      where: { id: appointment.clientId },
      relations: { role: true },
    });

    if (!extensionPeriodStart) {
      throw new BadRequestException("Invalid data.");
    }

    const date = new Date(extensionPeriodStart);

    let isCorporate: boolean = false;
    let company: Company | null = null;
    let country = clientUserRole.country;

    if (CORPORATE_CLIENT_ROLES.includes(clientUserRole.role.name)) {
      isCorporate = true;
      company = await findOneOrFail(clientUserRole.operatedByCompanyId, this.companyRepository, {
        where: { id: clientUserRole.operatedByCompanyId },
        relations: { paymentInformation: true },
      });

      country = company?.country;
    }

    if (!country) {
      throw new BadRequestException("Country not filled!");
    }

    const pricesOfAppointment = await this.calculateAppointmentPrice(
      appointment,
      date,
      isCorporate,
      country,
      additionalBlockDuration,
      discountMinutes,
    );

    if (isCorporate) {
      if (!company) {
        throw new BadRequestException("Company not found.");
      }

      await this.corporatePaymentsService.chargeFromDeposit(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        pricesOfAppointment.discounts,
        pricesOfAppointment.discountByMembershipMinutes,
        pricesOfAppointment.discountByMembershipDiscount,
        pricesOfAppointment.discountByPromoCode,
        company,
        ECurrencies.AUD,
      );
    } else {
      await this.individualPaymentsService.authorizePayment(
        pricesOfAppointment.amount,
        pricesOfAppointment.gstAmount,
        appointment.id,
        pricesOfAppointment.discounts,
        pricesOfAppointment.discountByMembershipMinutes,
        pricesOfAppointment.discountByMembershipDiscount,
        pricesOfAppointment.discountByPromoCode,
        ECurrencies.AUD,
      );
    }

    return EPayInStatus.AUTHORIZATION_SUCCESS;
  }

  public isIndividualGstPayer(clientCountry: string | null, interpreterIsGstPayer?: EGstPayer | null): IIsGstPayers {
    const res = { interpreter: false, client: false };

    if (interpreterIsGstPayer === EGstPayer.YES) {
      res.interpreter = true;
    }

    if (clientCountry === EExtCountry.AUSTRALIA) {
      res.client = true;
    }

    return res;
  }

  public isCorporateGstPayer(clientCountry: string | null, interpreterCountry?: string | null): IIsGstPayers {
    const res = { interpreter: false, client: false };

    if (interpreterCountry === EExtCountry.AUSTRALIA) {
      res.interpreter = true;
    }

    if (clientCountry === EExtCountry.AUSTRALIA) {
      res.client = true;
    }

    return res;
  }

  public async downloadReceipt(dto: DownloadReceiptDto): Promise<string> {
    const paymentExist = await this.paymentRepository.exists({
      where: [{ receipt: dto.receiptKey }, { taxInvoice: dto.receiptKey }, { items: { receipt: dto.receiptKey } }],
    });

    if (!paymentExist) {
      throw new BadRequestException("Receipt not exist!");
    }

    const receiptLink = await this.awsS3Service.getShortLivedSignedUrl(dto.receiptKey);

    return receiptLink;
  }

  public async makeManualPayInCaptureAndPayOut(dto: MakeManualPayoutAttemptDto): Promise<void> {
    return await this.makePayInCaptureAndPayOut(dto.appointmentId, true);
  }

  public async makePayInCaptureAndPayOut(appointmentId: string, isSecondAttempt: boolean = false): Promise<void> {
    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, {
      where: { id: appointmentId },
      relations: {
        client: {
          profile: true,
          role: true, // TODO R: remove after corporate payments be done
        },
        interpreter: {
          paymentInformation: true,
          profile: true,
          role: true,
        },
      },
    });

    if (!appointment.clientId || !appointment.client) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      throw new BadRequestException("Incorrect data");
    }

    let isCorporate: boolean = false;

    if (CORPORATE_CLIENT_ROLES.includes(appointment.client.role.name)) {
      isCorporate = true;
    }

    if (isCorporate) {
      await this.corporatePaymentsService.capturePayment(appointment, isSecondAttempt);
    } else {
      await this.individualPaymentsService.capturePayment(appointment, isSecondAttempt);
    }

    // TODO R: remove after corporate payments be done
    if (
      appointment.interpreter &&
      ![EUserRoleName.IND_PROFESSIONAL_INTERPRETER, EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER].includes(
        appointment.interpreter.role.name,
      )
    ) {
      return;
    }

    if (!appointment.interpreterId) {
      this.lokiLogger.error(
        `Appointment with id ${appointment.id} does not have interpreterId (${appointment.interpreterId})`,
      );

      return;
    }

    const date = new Date(appointment.scheduledStartTime);

    const scheduleDateTime = date.toISOString();

    const interpreterUserRole = await findOneOrFail(appointment.interpreterId, this.userRoleRepository, {
      where: { id: appointment.interpreterId },
      relations: { abnCheck: true, paymentInformation: true },
    });

    if (!interpreterUserRole.paymentInformation) {
      this.lokiLogger.error(`User role with id ${interpreterUserRole.id} does not have payment information`);

      return;
    }

    const isGstPayers = this.isIndividualGstPayer(null, interpreterUserRole?.abnCheck?.gstFromClient);

    const price = await this.ratesService.calculatePriceByOneDay(
      {
        interpreterType: appointment.interpreterType,
        schedulingType: appointment.schedulingType,
        communicationType: appointment.communicationType,
        interpretingType: appointment.interpretingType,
        topic: appointment.topic,
        duration: appointment.schedulingDurationMin,
        scheduleDateTime,
        extraDays: [],
      },
      appointment.schedulingDurationMin,
      scheduleDateTime,
      isGstPayers.interpreter,
      ERoleType.INTERPRETER,
    );

    const fullAmount = price.price;

    let amount = round2(fullAmount);
    let gstAmount = 0;

    const GST_COEFFICIENT = 1.1;

    if (isGstPayers.interpreter) {
      amount = round2(fullAmount / GST_COEFFICIENT);
      gstAmount = round2(fullAmount - amount);
    }

    await this.individualPaymentsService.makeTransferAndPayout(amount, gstAmount, appointment, isSecondAttempt);
  }

  public async checkPaymentWaitList(): Promise<void> {
    const getFindWaitlistWhereOptions = this.getFindWaitlistWhere();

    const paymentsInWaitList = await this.incomingPaymentWaitListRepository.find({
      where: getFindWaitlistWhereOptions,
      select: {
        id: true,
        appointment: {
          id: true,
          clientId: true,
          scheduledStartTime: true,
          schedulingDurationMin: true,
          interpreterType: true,
          schedulingType: true,
          communicationType: true,
          interpretingType: true,
          topic: true,
        },
        paymentAttemptCount: true,
      },
    });

    const waitListItemsIdWithSuccessfulAuth: string[] = [];

    for (const paymentInWaitList of paymentsInWaitList) {
      if (
        new Date(paymentInWaitList.appointment.scheduledStartTime) >=
        addMinutes(new Date(), MINUTES_BEFORE_START_AS_REASON_TO_CANCEL)
      ) {
        await this.incomingPaymentWaitListRepository.delete({ id: paymentInWaitList.id });

        await this.appointmentFailedPaymentCancelService
          .cancelAppointmentPaymentFailed(paymentInWaitList.appointment.id)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to cancel payin auth: ${error.message}, appointmentId: ${paymentInWaitList.appointment.id}`,
              error.stack,
            );
          });

        continue;
      }

      const paymentStatus = await this.makePayInAuth(paymentInWaitList.appointment).catch(async (error: Error) => {
        this.lokiLogger.error(
          `Failed to make payin: ${error.message}, appointmentId: ${paymentInWaitList.appointment.id}`,
          error.stack,
        );

        return EPayInStatus.AUTHORIZATION_FAILED;
      });

      if (paymentStatus === EPayInStatus.AUTHORIZATION_SUCCESS) {
        waitListItemsIdWithSuccessfulAuth.push(paymentInWaitList.id);
      } else {
        await this.incomingPaymentWaitListRepository.update(
          { id: paymentInWaitList.id },
          { paymentAttemptCount: paymentInWaitList.paymentAttemptCount + 1 },
        );

        if (paymentInWaitList.appointment.clientId) {
          await this.notificationService.sendAppointmentPaymentFailedNotification(
            paymentInWaitList.appointment.clientId,
            paymentInWaitList.appointment.platformId,
            EPaymentFailedReason.AUTH_FAILED,
            { appointmentId: paymentInWaitList.appointment.id },
          );
        }
      }
    }

    await this.incomingPaymentWaitListRepository.delete({ id: In(waitListItemsIdWithSuccessfulAuth) });

    this.lokiLogger.log(
      `Check payment wait list cron. Processed: ${paymentsInWaitList.length} appointments. From them successfully: ${waitListItemsIdWithSuccessfulAuth.length}`,
    );
  }

  public async getIndividualPaymentsList(
    dto: GetIndividualPaymentsDto,
    user: ITokenUserData,
  ): Promise<IGetIndividualPaymentResponse> {
    const queryBuilder = this.paymentRepository.createQueryBuilder("payment");
    this.paymentsQueryOptionsService.getIndividualPaymentsListOptions(queryBuilder, dto, user);
    const [payments, count] = await queryBuilder.getManyAndCount();

    const result: IGetIndividualPayment[] = [];

    for (const payment of payments) {
      let amount = payment.totalFullAmount;
      let appointmentDate: string | null = null;
      let dueDate: string | null = null;
      let invoiceNumber: string | undefined = payment?.appointment?.platformId;

      if (dto.receiptType && dto.receiptType === EReceiptType.TAX_INVOICE) {
        amount = payment.totalGstAmount;
      }

      if (payment.appointment?.scheduledStartTime) {
        appointmentDate = format(payment.appointment.scheduledStartTime, "dd MMM yyyy");
      }

      if (payment.items && payment.items.length > 0 && DUE_PAYMENT_STATUSES.includes(payment.items[0].status)) {
        dueDate = format(payment.items[0].updatingDate, "dd MMM yyyy");
      }

      if (payment.membershipId && payment.fromClient) {
        invoiceNumber = `${payment.fromClient.user.platformId}-${payment.platformId}`;
      }

      if (payment.isDepositCharge && payment.company) {
        invoiceNumber = `${payment.company.platformId}-${payment.platformId}`;
      }

      result.push({
        invoiceNumber,
        appointmentDate,
        dueDate,
        amount: `${round2(Number(amount))} ${payment.currency}`,
        status: payment.items[0]?.status,
        paymentMethod: payment.paymentMethodInfo,
        internalReceiptKey: payment.receipt,
        taxInvoiceKey: payment.taxInvoice,
        note: payment.note,
      });
    }

    return { data: result, total: count, limit: dto.limit, offset: dto.offset };
  }

  private async changeAppointmentStatusToPending(appointmentId: string): Promise<void> {
    await this.appointmentRepository.update({ id: appointmentId }, { status: EAppointmentStatus.PENDING });
  }

  private getFindWaitlistWhere(): FindOptionsWhere<IncomingPaymentsWaitList>[] {
    const currentDate = new Date();

    const where: FindOptionsWhere<IncomingPaymentsWaitList>[] = [];

    for (const shift of PAYMENT_FRAMES) {
      const shiftedDate = addMinutes(currentDate, shift);

      const interval = this.getPaymentFrameInterval(shiftedDate);

      where.push({
        appointment: { scheduledStartTime: Between(interval.timeframeStart, interval.timeframeEnd) },
      });
    }

    return where;
  }

  private getPaymentFrameInterval(date: Date): { timeframeStart: Date; timeframeEnd: Date } {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / NUMBER_OF_MINUTES_IN_TEN_MINUTES) * NUMBER_OF_MINUTES_IN_TEN_MINUTES;

    const newDate = new Date(date.setMinutes(roundedMinutes, 0, 0));

    const timeframeStart = newDate;
    const timeframeEnd = subMilliseconds(addMinutes(newDate, NUMBER_OF_MINUTES_IN_TEN_MINUTES), 1);

    return { timeframeStart, timeframeEnd };
  }

  private applyDiscountByMinutesDiscount(
    duration: number,
    fullAmount: number,
    isGstPayers: IIsGstPayers,
    price: ICalculatePrice,
    discountMinutes?: number,
    discountPercent: number = ONE_HUNDRED,
    isGstCalculatedBefore: boolean = false,
  ): IApplyDiscountByMinutes {
    let appointmentMinutesRemnant = duration;
    let isGstCalculated = false;

    if (discountMinutes && discountMinutes > 0) {
      if (duration <= discountMinutes) {
        appointmentMinutesRemnant = 0;

        if (discountPercent >= ONE_HUNDRED) {
          fullAmount = 0;
        } else {
          fullAmount -= fullAmount * (discountPercent / ONE_HUNDRED);
        }
      } else {
        appointmentMinutesRemnant = duration - discountMinutes;
        let freeMinutesRemnant = discountMinutes;

        for (const priceBlock of price.priceByBlocks) {
          if (priceBlock.price <= 0) {
            continue;
          }

          if (!isGstCalculatedBefore && isGstPayers.client) {
            const amount = priceBlock.price / GST_COEFFICIENT;
            const gstAmount = priceBlock.price - amount;
            priceBlock.price -= gstAmount;

            isGstCalculated = true;
          }

          if (freeMinutesRemnant > 0) {
            if (freeMinutesRemnant >= priceBlock.duration) {
              fullAmount -= priceBlock.price * (discountPercent / ONE_HUNDRED);
              priceBlock.price -= priceBlock.price * (discountPercent / ONE_HUNDRED);
              freeMinutesRemnant -= priceBlock.duration;
            } else {
              const blockAmountFree = (freeMinutesRemnant * priceBlock.price) / priceBlock.duration;
              fullAmount -= blockAmountFree * (discountPercent / ONE_HUNDRED);
              priceBlock.price -= blockAmountFree * (discountPercent / ONE_HUNDRED);

              const priceBlockDuration = priceBlock.duration;
              priceBlock.duration -= freeMinutesRemnant;
              freeMinutesRemnant -= priceBlockDuration;
            }

            if (freeMinutesRemnant < 0) {
              freeMinutesRemnant = 0;
            }
          } else {
            continue;
          }
        }
      }
    }

    return { fullAmount: round2(fullAmount), newPrice: price, appointmentMinutesRemnant, isGstCalculated };
  }

  private async calculateAppointmentPrice(
    appointment: Appointment,
    date: Date,
    isCorporate: boolean,
    country: string,
    duration?: number,
    discountMinutes?: number, // TODO R: How match with mixpromo?
  ): Promise<ICalculateAppointmentPrices> {
    const discounts = await this.discountsService.fetchDiscountRate(appointment.id);

    if (!duration) {
      duration = appointment.schedulingDurationMin;
    }

    const scheduleDateTime = date.toISOString();

    let isGstPayers: IIsGstPayers;

    if (isCorporate) {
      isGstPayers = this.isCorporateGstPayer(country);
    } else {
      isGstPayers = this.isIndividualGstPayer(country);
    }

    const price: ICalculatePrice = await this.ratesService.calculatePriceByOneDay(
      {
        interpreterType: appointment.interpreterType,
        schedulingType: appointment.schedulingType,
        communicationType: appointment.communicationType,
        interpretingType: appointment.interpretingType,
        topic: appointment.topic,
        duration,
        scheduleDateTime,
        extraDays: [],
      },
      duration,
      scheduleDateTime,
      isGstPayers.client,
      ERoleType.CLIENT,
    );

    let startingPrice = price.price;

    let amount = startingPrice;
    let gstAmount = 0;

    if (isGstPayers.client) {
      amount = round2(startingPrice / GST_COEFFICIENT);
      gstAmount = round2(startingPrice - amount);
      startingPrice = round2(startingPrice - gstAmount);
    }

    let amountAndAppliedDiscounts: {
      amount: number;
      discountByMembershipMinutes: number;
      discountByMembershipDiscount: number;
      discountByPromoCode: number;
    } | null = null;

    if (discounts) {
      amountAndAppliedDiscounts = this.applyAppointmentDiscount(
        startingPrice,
        discounts,
        isGstPayers,
        price,
        duration,
        discountMinutes,
      );

      amount = amountAndAppliedDiscounts.amount;
    }

    if (isGstPayers.client) {
      gstAmount = round2(amount / TEN);
    }

    return {
      amount,
      gstAmount,
      discountByMembershipMinutes: amountAndAppliedDiscounts?.discountByMembershipMinutes || 0,
      discountByMembershipDiscount: amountAndAppliedDiscounts?.discountByMembershipDiscount || 0,
      discountByPromoCode: amountAndAppliedDiscounts?.discountByPromoCode || 0,
      discounts,
    };
  }

  private applyAppointmentDiscount(
    startingPrice: number,
    discounts: IDiscountRate | void,
    isGstPayers: IIsGstPayers,
    price: ICalculatePrice,
    duration: number,
    discountMinutes?: number,
  ): IApplyDiscounts {
    let discountMinutesByMembership = discountMinutes;

    if (!discountMinutesByMembership && discounts && discounts.membershipFreeMinutes) {
      discountMinutesByMembership = discounts?.membershipFreeMinutes ?? 0;
    }

    const priceAfterFreeMinutesApplying = this.applyDiscountByMinutesDiscount(
      duration,
      startingPrice,
      isGstPayers,
      price,
      discountMinutesByMembership,
    );

    const discountByMembershipMinutes = round2(startingPrice - priceAfterFreeMinutesApplying.fullAmount);
    startingPrice = priceAfterFreeMinutesApplying.fullAmount;

    let amount = round2(startingPrice);

    let discountByMembershipDiscount = 0;
    let discountByPromoCode = 0;

    if (
      discounts &&
      priceAfterFreeMinutesApplying.appointmentMinutesRemnant > 0 &&
      priceAfterFreeMinutesApplying.fullAmount > 0
    ) {
      if (discounts.promoCampaignDiscount && discounts.membershipDiscount) {
        const amountAndAppliedDiscounts = this.applyMembershipAndPromoDiscount(
          discounts,
          priceAfterFreeMinutesApplying,
          startingPrice,
          isGstPayers,
          amount,
        );

        amount = amountAndAppliedDiscounts.amount;
        discountByMembershipDiscount = amountAndAppliedDiscounts.discountByMembershipDiscount;
        discountByPromoCode = amountAndAppliedDiscounts.discountByPromoCode;
      } else if (discounts.promoCampaignDiscount) {
        const amountAndAppliedDiscounts = this.applyPromoDiscount(
          discounts,
          priceAfterFreeMinutesApplying,
          startingPrice,
          isGstPayers,
          amount,
        );

        amount = amountAndAppliedDiscounts.amount;
        discountByPromoCode = amountAndAppliedDiscounts.discountByPromoCode;
      } else if (discounts.membershipDiscount) {
        const amountAndAppliedDiscounts = this.applyMembershipDiscount(discounts, amount);

        amount = amountAndAppliedDiscounts.amount;
        discountByMembershipDiscount = amountAndAppliedDiscounts.discountByMembershipDiscount;
      }
    }

    return { amount, discountByMembershipMinutes, discountByMembershipDiscount, discountByPromoCode };
  }

  private applyMembershipAndPromoDiscount(
    discounts: IDiscountRate,
    priceAfterFreeMinutesApplying: IApplyDiscountByMinutes,
    startingPrice: number,
    isGstPayers: IIsGstPayers,
    amount: number,
  ): IApplyDiscountByMembershipAndPromo {
    let discountByPromoCode = 0;
    let discountByMembershipDiscount = 0;

    if (
      discounts.promoCampaignDiscount &&
      discounts.membershipDiscount &&
      discounts.promoCampaignDiscount > discounts.membershipDiscount
    ) {
      if (discounts.promoCampaignDiscountMinutes) {
        const priceAfterMixpromoApplying = this.applyDiscountByMinutesDiscount(
          priceAfterFreeMinutesApplying.appointmentMinutesRemnant,
          startingPrice,
          isGstPayers,
          priceAfterFreeMinutesApplying.newPrice,
          discounts.promoCampaignDiscountMinutes,
          discounts.promoCampaignDiscount,
          priceAfterFreeMinutesApplying.isGstCalculated,
        );

        discountByPromoCode = round2(startingPrice - priceAfterMixpromoApplying.fullAmount);

        if (priceAfterMixpromoApplying.fullAmount > 0) {
          amount = round2(
            priceAfterMixpromoApplying.fullAmount -
              priceAfterMixpromoApplying.fullAmount * (discounts.membershipDiscount / ONE_HUNDRED),
          );
        } else {
          amount = 0;
        }

        discountByMembershipDiscount = priceAfterMixpromoApplying.fullAmount - amount;
      } else {
        const newAmount = round2(amount - amount * (discounts.promoCampaignDiscount / ONE_HUNDRED));
        discountByPromoCode = round2(amount - newAmount);
        amount = newAmount;
      }
    } else if (discounts.membershipDiscount) {
      const newAmount = round2(amount - amount * (discounts.membershipDiscount / ONE_HUNDRED));
      discountByMembershipDiscount = round2(amount - newAmount);
      amount = newAmount;
    }

    return { discountByPromoCode, discountByMembershipDiscount, amount };
  }

  private applyPromoDiscount(
    discounts: IDiscountRate,
    priceAfterFreeMinutesApplying: IApplyDiscountByMinutes,
    startingPrice: number,
    isGstPayers: IIsGstPayers,
    amount: number,
  ): IApplyDiscountByPromo {
    let discountByPromoCode = 0;

    if (discounts.promoCampaignDiscount) {
      if (discounts.promoCampaignDiscountMinutes) {
        const priceAfterMixpromoApplying = this.applyDiscountByMinutesDiscount(
          priceAfterFreeMinutesApplying.appointmentMinutesRemnant,
          startingPrice,
          isGstPayers,
          priceAfterFreeMinutesApplying.newPrice,
          discounts.promoCampaignDiscountMinutes,
          discounts.promoCampaignDiscount,
          priceAfterFreeMinutesApplying.isGstCalculated,
        );

        discountByPromoCode = round2(amount - priceAfterMixpromoApplying.fullAmount);

        amount = round2(priceAfterMixpromoApplying.fullAmount);
      } else {
        const newAmount = round2(amount - amount * (discounts.promoCampaignDiscount / ONE_HUNDRED));
        discountByPromoCode = round2(amount - newAmount);
        amount = newAmount;
      }
    }

    return { discountByPromoCode, amount };
  }

  private applyMembershipDiscount(discounts: IDiscountRate, amount: number): IApplyDiscountByMembership {
    let discountByMembershipDiscount = 0;

    if (discounts.membershipDiscount) {
      const newAmount = round2(amount - amount * (discounts.membershipDiscount / ONE_HUNDRED));
      discountByMembershipDiscount = round2(amount - newAmount);
      amount = newAmount;
    }

    return { discountByMembershipDiscount, amount };
  }
}
