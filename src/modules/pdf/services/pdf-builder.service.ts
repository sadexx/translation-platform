import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments/entities";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users-roles/entities";
import { Company } from "src/modules/companies/entities";
import { findOneOrFail, getDifferenceInHHMM } from "src/common/utils";
import {
  IInterpreterBadge,
  IInterpreterBadgeWithKey,
  IMembershipInvoice,
  IMembershipInvoiceWithKey,
  IPayInReceipt,
  IPayInReceiptWithKey,
  IPayOutReceipt,
  IPayOutReceiptWithKey,
  ITaxInvoiceReceipt,
  ITaxInvoiceReceiptWithKey,
} from "src/modules/pdf/common/interfaces";
import { format } from "date-fns";
import { getInterpretingType } from "src/modules/pdf/common/helpers";
import { randomUUID } from "node:crypto";
import { PdfService, PdfTemplatesService } from "src/modules/pdf/services";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { DEFAULT_EMPTY_VALUE } from "src/common/constants";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { ECurrencies } from "src/modules/payments/common/enums";
import { StripeService } from "src/modules/stripe/services";

@Injectable()
export class PdfBuilderService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly pdfTemplatesService: PdfTemplatesService,
    private readonly pdfService: PdfService,
    private readonly stripeService: StripeService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  public async generatePayInReceipt(paymentId: string): Promise<IPayInReceiptWithKey> {
    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: {
        appointment: {
          interpreter: { user: true },
          client: { profile: true, address: true, user: true, paymentInformation: true },
        },
        items: true,
      },
    });

    if (!payment.appointment) {
      throw new BadRequestException("Payment doesn`t have relation to appointment!");
    }

    if (!payment.appointment.client) {
      throw new BadRequestException("Appointment client not fill!");
    }

    const clientRole = payment.appointment.client;

    if (!clientRole.profile) {
      throw new BadRequestException("Client profile does not fill!");
    }

    if (!clientRole.address) {
      throw new BadRequestException("Client address does not fill!");
    }

    if (!clientRole.paymentInformation || !clientRole.paymentInformation.stripeClientPaymentMethodId) {
      throw new BadRequestException("Client payment info does not fill!");
    }

    if (!payment.appointment) {
      throw new BadRequestException("Payment appointment is not assigned!");
    }

    if (!payment.appointment.interpreter) {
      throw new BadRequestException("Appointment interpreter not fill!");
    }

    if (!payment.appointment.businessEndTime) {
      throw new BadRequestException("Appointment business end time not fill!");
    }

    const currentDay = format(new Date(), "dd/MM/yyyy");

    const paymentMethodInfo = await this.stripeService.paymentMethodInfo(
      clientRole.paymentInformation.stripeClientPaymentMethodId,
    );

    const receiptData: IPayInReceipt = {
      userName: `${clientRole.profile.title}. ${clientRole.profile.firstName} ${clientRole.profile.lastName}`,
      clientId: clientRole.user.platformId,
      addressLine1: `${clientRole.address.streetNumber} ${clientRole.address.streetName}, ${clientRole.address.suburb}`,
      addressLine2: `${clientRole.address.state}, ${clientRole.address.postcode}, ${clientRole.address.country}`,
      currency: payment.currency,
      issueDate: currentDay,
      total: `${payment.totalAmount} AUD`,
      gstAmount: `${payment.totalGstAmount} AUD`,
      invoiceTotal: `${payment.totalFullAmount} AUD`,
      amountPaid: `-${payment.totalFullAmount} AUD`,
      amountDue: "0.00 AUD",
      bookingId: `#${payment.appointment.platformId}`,
      service: `${payment.appointment.schedulingType} ${payment.appointment.communicationType} ${getInterpretingType(payment.appointment.interpreterType)}`,
      topic: payment.appointment.topic,
      serviceDate: format(payment.appointment.scheduledStartTime, "dd MMM yyyy HH:mm"),
      interpreterId: payment.appointment.interpreter.user.platformId,
      duration: getDifferenceInHHMM(payment.appointment.scheduledStartTime, payment.appointment.businessEndTime),
      date: currentDay,
      description: `Online Credit Card Payment ${paymentMethodInfo.card?.display_brand} Card# ************${paymentMethodInfo.card?.last4}`,
      paymentTotal: `-${payment.totalFullAmount} AUD`,
      thisInvoice: `${payment.totalFullAmount} AUD`,
      receiptNumber: payment.appointment.platformId,
      promoCampaignDiscount: payment.items[0].appliedPromoDiscountsPercent,
      membershipDiscount: payment.items[0].appliedMembershipDiscountsPercent,
      promoCampaignDiscountMinutes: payment.items[0].appliedPromoDiscountsMinutes,
      membershipFreeMinutes: payment.items[0].appliedMembershipFreeMinutes,
      promoCode: payment.items[0].appliedPromoCode,
      membershipType: payment.items[0].appliedMembershipType,
    };

    const docDefinition = this.pdfTemplatesService.payInReceiptTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generatePayOutReceipt(paymentId: string): Promise<IPayOutReceiptWithKey> {
    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: { appointment: { interpreter: { profile: true, user: true } } },
    });

    if (!payment.appointment) {
      throw new BadRequestException("Payment doesn`t have relation to appointment!");
    }

    if (!payment.appointment.interpreter) {
      throw new BadRequestException("Appointment interpreter not fill!");
    }

    const interpreterRole = payment.appointment.interpreter;

    if (!interpreterRole.profile) {
      throw new BadRequestException("Interpreter profile does not fill!");
    }

    if (!payment.appointment) {
      throw new BadRequestException("Payment appointment is not assigned!");
    }

    if (!payment.appointment.businessEndTime) {
      throw new BadRequestException("Appointment business end time not fill!");
    }

    const currentDay = format(new Date(), "dd/MM/yyyy");

    const receiptData: IPayOutReceipt = {
      receiptNumber: payment.appointment.platformId,
      issueDate: currentDay,
      userName: `${interpreterRole.profile.title}. ${interpreterRole.profile.firstName} ${interpreterRole.profile.lastName}`,
      interpreterId: interpreterRole.user.platformId,
      firstName: interpreterRole.profile.firstName,
      fullAmountWithoutCurrency: `${payment.totalFullAmount}`,
      currency: payment.currency,
      amount: `${payment.totalAmount} AUD`,
      gstAmount: `${payment.totalGstAmount} AUD`,
      fullAmount: `${payment.totalFullAmount} AUD`,
      paymentDate: currentDay,
      bookingId: `#${payment.appointment.platformId}`,
      service: `${payment.appointment.schedulingType} ${payment.appointment.communicationType} ${getInterpretingType(payment.appointment.interpreterType)}`,
      topic: payment.appointment.topic,
      duration: getDifferenceInHHMM(payment.appointment.scheduledStartTime, payment.appointment.businessEndTime),
      serviceDate: format(payment.appointment.scheduledStartTime, "dd MMM yyyy HH:mm"),
    };

    const docDefinition = this.pdfTemplatesService.payOutReceiptTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateTaxInvoiceReceipt(paymentId: string): Promise<ITaxInvoiceReceiptWithKey> {
    const payment = await findOneOrFail(paymentId, this.paymentRepository, {
      where: { id: paymentId },
      relations: {
        appointment: {
          interpreter: {
            profile: true,
            user: true,
            address: true,
            abnCheck: true,
          },
        },
      },
    });

    if (!payment.appointment) {
      throw new BadRequestException("Payment doesn`t have relation to appointment!");
    }

    if (!payment.appointment.interpreter) {
      throw new BadRequestException("Appointment interpreter not fill!");
    }

    const interpreterRole = payment.appointment.interpreter;

    if (!interpreterRole.profile) {
      throw new BadRequestException("Interpreter profile does not fill!");
    }

    if (
      !interpreterRole.address.streetNumber ||
      !interpreterRole.address.streetName ||
      !interpreterRole.address.suburb ||
      !interpreterRole.address.state ||
      !interpreterRole.address.postcode
    ) {
      throw new BadRequestException("Interpreter address does not fill!");
    }

    if (!interpreterRole.abnCheck || !interpreterRole.abnCheck.abnNumber) {
      throw new BadRequestException("Interpreter ABN does not fill!");
    }

    if (!payment.appointment.businessEndTime) {
      throw new BadRequestException("Appointment business end time not fill!");
    }

    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      where: { id: COMPANY_LFH_ID },
      relations: { address: true },
    });

    if (
      !lfhCompany.address.streetNumber ||
      !lfhCompany.address.streetName ||
      !lfhCompany.address.suburb ||
      !lfhCompany.address.state ||
      !lfhCompany.address.postcode ||
      !lfhCompany.abnNumber
    ) {
      throw new InternalServerErrorException("Company LFH data not seeded");
    }

    const currentDay = format(new Date(), "dd/MM/yyyy");

    const receiptData: ITaxInvoiceReceipt = {
      invoiceDate: currentDay,
      interpreterId: interpreterRole.user.platformId,

      companyName: lfhCompany.name,
      companyAddress: `${lfhCompany.address.streetNumber} ${lfhCompany.address.streetName}`,
      companySuburb: lfhCompany.address.suburb,
      companyState: lfhCompany.address.state,
      companyPostcode: lfhCompany.address.postcode,
      companyABN: lfhCompany.abnNumber,

      supplierName: `${interpreterRole.profile.firstName} ${interpreterRole.profile.lastName}`,
      supplierAddress: `${interpreterRole.address.streetNumber} ${interpreterRole.address.streetName}`,
      supplierSuburb: interpreterRole.address.suburb,
      supplierState: interpreterRole.address.state,
      supplierPostcode: interpreterRole.address.postcode,
      supplierABN: interpreterRole.abnCheck.abnNumber,

      bookingId: payment.appointment.platformId,
      serviceDate: format(payment.appointment.scheduledStartTime, "dd MMM yyyy HH:mm"),
      description: `${payment.appointment.communicationType} interpreting ${payment.appointment.schedulingType} (${payment.appointment.topic})`,
      duration: getDifferenceInHHMM(payment.appointment.scheduledStartTime, payment.appointment.businessEndTime),
      valueExclGST: `${payment.totalAmount} AUD`,
      valueGST: `${payment.totalGstAmount} AUD`,
      total: `${payment.totalFullAmount} AUD`,
    };

    const docDefinition = this.pdfTemplatesService.taxInvoiceTemplate(receiptData);

    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateMembershipInvoice(
    payment: Payment,
    userRole: UserRole,
    membershipType: EMembershipType,
    currency: ECurrencies,
  ): Promise<IMembershipInvoiceWithKey> {
    const isUserFromAu: boolean = Boolean(userRole.abnCheck);

    const receiptData: IMembershipInvoice = {
      clientName: `${userRole.profile.firstName} ${userRole.profile.lastName}`,
      clientAddress: `${userRole.address.streetNumber} ${userRole.address.streetName}`,
      clientSuburb: userRole.address.suburb,
      clientState: userRole.address.state,
      clientPostcode: userRole.address.postcode || "",
      clientABN: userRole.abnCheck?.abnNumber,
      clientId: userRole.user.platformId,
      invoiceDate: format(new Date(), "dd/MM/yyyy"),
      membershipType: membershipType,
      valueExclGST: `${payment.totalAmount - payment.totalGstAmount} ${currency}`,
      valueGST: `${payment.totalGstAmount} ${currency}`,
      total: `${payment.totalAmount} ${currency}`,
    };

    const docDefinition = this.pdfTemplatesService.membershipInvoiceTemplate(receiptData, isUserFromAu);
    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `payments/lfh-receipts/${randomUUID()}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf");

    return { receiptKey: key, receiptData };
  }

  public async generateInterpreterBadge(
    userRoleId: string,
    interpreterBadge?: string,
  ): Promise<IInterpreterBadgeWithKey> {
    const userRole = await findOneOrFail(userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByCompanyName: true,
        role: {
          id: true,
          name: true,
        },
        user: {
          id: true,
          platformId: true,
          avatarUrl: true,
        },
        profile: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
        interpreterProfile: {
          id: true,
          interpreterBadge: true,
          averageRating: true,
        },
      },
      where: { id: userRoleId },
      relations: { role: true, user: true, profile: true, interpreterProfile: true },
    });
    const { role, user, profile, interpreterProfile } = userRole;

    if (!interpreterProfile || !interpreterProfile.averageRating || !user.avatarUrl) {
      throw new BadRequestException("Insufficient data to generate interpreter badge.");
    }

    const IS_MEDIA_BUCKET = true;
    const definedInterpreterRole =
      role.name === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER ? "Language Buddy" : "Professional Interpreter";
    const definedCompanyName =
      userRole.operatedByCompanyId !== COMPANY_LFH_ID ? userRole.operatedByCompanyName : DEFAULT_EMPTY_VALUE;
    const definedInterpreterBadge = interpreterBadge ?? interpreterProfile.interpreterBadge ?? "";

    const interpreterBadgeData: IInterpreterBadge = {
      userRoleId: userRole.id,
      platformId: user.platformId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      title: profile.title,
      interpreterRole: definedInterpreterRole,
      avatar: user.avatarUrl,
      averageRating: interpreterProfile.averageRating,
      interpreterBadge: definedInterpreterBadge,
      companyName: definedCompanyName,
    };

    const docDefinition = await this.pdfTemplatesService.interpreterBadgeTemplate(interpreterBadgeData);
    const pdfStream = await this.pdfService.generatePdf(docDefinition);

    const key = `users/interpreter-badges/${userRoleId}.pdf`;
    await this.awsS3Service.uploadObject(key, pdfStream, "application/pdf", IS_MEDIA_BUCKET);

    return { interpreterBadgeKey: key, interpreterBadgeData };
  }
}
