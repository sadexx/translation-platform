import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Membership, MembershipAssignment, MembershipPrice } from "src/modules/memberships/entities";
import { In, Not, Repository } from "typeorm";
import { membershipsSeedData } from "src/modules/memberships/common/seed-data";
import {
  EMembershipAssignmentStatus,
  EMembershipNotificationType,
  EMembershipPricingRegion,
  EMembershipStatus,
  membershipRanking,
} from "src/modules/memberships/common/enums";
import { findOneOrFail, normalizedAmountToDenormalized } from "src/common/utils";
import { EmailsService } from "src/modules/emails/services";
import { UpdateMembershipDto, UpdateMembershipPriceDto } from "src/modules/memberships/common/dto";
import { ESortOrder } from "src/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { StripeService } from "src/modules/stripe/services";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { MembershipAssignmentsService } from "src/modules/memberships/services";
import { Payment, PaymentItem } from "src/modules/payments/entities";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { randomUUID } from "node:crypto";
import { ECurrencies, EPaymentDirection, EPaymentStatus } from "src/modules/payments/common/enums";
import { PdfBuilderService } from "src/modules/pdf/services";
import { UserRole } from "src/modules/users-roles/entities";
import { GetUserMembershipsOutput } from "src/modules/memberships/common/outputs";
import { plainToInstance } from "class-transformer";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { QueueInitializeService } from "src/modules/queues/services";
import { DiscountHolder } from "src/modules/discounts/entities";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class MembershipsService {
  private readonly BACK_END_URL: string;
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipPrice)
    private readonly membershipPriceRepository: Repository<MembershipPrice>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,
    private readonly stripeService: StripeService,
    private readonly pdfBuilderService: PdfBuilderService,
    @Inject(forwardRef(() => MembershipAssignmentsService))
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly emailsService: EmailsService,
    private readonly awsS3Service: AwsS3Service,
    private readonly configService: ConfigService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly helperService: HelperService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("backEndUrl");
  }

  public async seedMembershipsToDatabase(): Promise<void> {
    const membershipsCount = await this.membershipRepository.count();

    if (membershipsCount === 0) {
      const seedData = membershipsSeedData(this.configService);
      await this.membershipRepository.save(seedData);
    }
  }

  public async getAdminMemberships(): Promise<Membership[]> {
    const memberships = await this.membershipRepository.find({
      order: { type: ESortOrder.ASC },
      relations: { membershipPrices: true },
    });

    return memberships;
  }

  public async getUserMemberships(user: ITokenUserData): Promise<GetUserMembershipsOutput[]> {
    const userRole = await this.helperService.getUserRoleById(user.userRoleId, { abnCheck: true });
    const memberships = await this.membershipRepository.find({
      where: { status: Not(EMembershipStatus.DEACTIVATED) },
      order: { type: ESortOrder.ASC },
      relations: { membershipPrices: true },
    });

    return plainToInstance(
      GetUserMembershipsOutput,
      memberships.map((membership) => {
        const { price, currency } = this.getMembershipPrice(membership, userRole);

        return {
          ...membership,
          price,
          currency,
        };
      }),
    );
  }

  public async createStripeSubscription(id: string, user: ITokenUserData): Promise<void> {
    const userRole = await this.helperService.getUserRoleById(user.userRoleId, {
      paymentInformation: true,
      profile: true,
      abnCheck: true,
      discountHolder: { membershipAssignment: { currentMembership: true } },
    });
    const membership = await findOneOrFail(id, this.membershipRepository, {
      where: { id: id },
      relations: { membershipPrices: true },
    });

    const { paymentInformation, discountHolder } = userRole;
    const { stripePriceId } = this.getMembershipPrice(membership, userRole);

    if (
      !paymentInformation?.stripeClientAccountId ||
      !paymentInformation?.stripeClientPaymentMethodId ||
      !stripePriceId
    ) {
      throw new BadRequestException("User payment or membership pricing information is missing.");
    }

    const trialEndTimestamp = this.getTrialEndTimestamp(membership, discountHolder);
    await this.stripeService.createSubscription(
      paymentInformation.stripeClientAccountId,
      paymentInformation.stripeClientPaymentMethodId,
      stripePriceId,
      {
        membershipId: id,
        userRoleId: user.userRoleId,
        userEmail: userRole.profile.contactEmail,
        userFirstName: userRole.profile.firstName,
      },
      trialEndTimestamp,
    );
    await this.membershipAssignmentsService.processMembershipSubscription(membership.id, userRole.id);
  }

  public async cancelStripeSubscription(user: ITokenUserData): Promise<void> {
    const userRole = await this.helperService.getUserRoleById(user.userRoleId, { paymentInformation: true });

    if (!userRole?.paymentInformation?.stripeClientAccountId) {
      throw new BadRequestException("User payment information not found.");
    }

    await this.membershipAssignmentRepository.update({ userRole: { id: user.userRoleId } }, { nextMembership: null });
    await this.stripeService.cancelSubscriptionByCustomerId(userRole.paymentInformation.stripeClientAccountId);
  }

  public async updateMembership(id: string, dto: UpdateMembershipDto): Promise<void> {
    if (dto.isMostPopular === true) {
      await this.membershipRepository.update({}, { isMostPopular: false });
    }

    await this.membershipRepository.update(id, dto);
  }

  public async updateMembershipPrice(id: string, dto: UpdateMembershipPriceDto): Promise<void> {
    const membershipPrice = await findOneOrFail(id, this.membershipPriceRepository, {
      where: { id: id },
      relations: {
        membership: {
          currentMemberships: { discountHolder: { userRole: { paymentInformation: true } } },
        },
      },
    });

    if (dto.price === membershipPrice.price) {
      return;
    }

    const newStripePrice = await this.stripeService.createNewProductPrice(
      membershipPrice.stripePriceId,
      dto.price,
      membershipPrice.currency,
    );
    await this.membershipPriceRepository.update(id, { price: dto.price, stripePriceId: newStripePrice.id });

    const updatedMembership = await findOneOrFail(id, this.membershipRepository, {
      where: { id: membershipPrice.membership.id },
      relations: {
        membershipPrices: true,
        currentMemberships: { discountHolder: { userRole: { user: true, profile: true } } },
      },
    });

    const customerIds: string[] = [];
    for (const membershipAssignment of membershipPrice.membership.currentMemberships || []) {
      const userRole = membershipAssignment.discountHolder?.userRole;
      const customerId = userRole?.paymentInformation?.stripeClientAccountId;

      if (customerId) {
        customerIds.push(customerId);
      }
    }

    if (customerIds.length > 0) {
      await this.queueInitializeService.addSubscriptionsUpdatePriceQueue(customerIds, newStripePrice.id);
    }

    await this.queueInitializeService.addNotifyUsersAboutMembershipChangesQueue(
      updatedMembership,
      EMembershipNotificationType.PRICE_UPDATE,
      membershipPrice.region,
    );
  }

  public async activateMembership(id: string): Promise<void> {
    const membership = await findOneOrFail(id, this.membershipRepository, {
      where: { id: id },
      relations: { membershipPrices: true },
    });

    await this.membershipRepository.update(id, {
      status: EMembershipStatus.ACTIVE,
    });

    const stripePriceId = membership.membershipPrices[0].stripePriceId;
    await this.stripeService.activateSubscriptionProduct(stripePriceId);
  }

  public async deactivateMembership(id: string): Promise<void> {
    const membership = await findOneOrFail(id, this.membershipRepository, {
      where: { id: id },
      relations: {
        membershipPrices: true,
        currentMemberships: { discountHolder: { userRole: { user: true, profile: true } } },
      },
    });

    if (membership.status === EMembershipStatus.DEACTIVATED) {
      throw new BadRequestException("Membership already deactivated.");
    }

    await this.membershipRepository.update(id, {
      status: EMembershipStatus.DEACTIVATED,
    });

    if (membership.currentMemberships && membership.currentMemberships.length > 0) {
      const membershipAssignmentIds = membership.currentMemberships.map((assignment) => assignment.id);
      await this.membershipAssignmentRepository.update({ id: In(membershipAssignmentIds) }, { nextMembership: null });
    }

    await this.queueInitializeService.addNotifyUsersAboutMembershipChangesQueue(
      membership,
      EMembershipNotificationType.DEACTIVATION,
    );

    const stripePriceIds = membership.membershipPrices.map((price) => price.stripePriceId);
    await this.stripeService.deactivateSubscriptionProduct(stripePriceIds);
  }

  public async processMembershipPaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await this.stripeService.getSubscription(invoice.subscription as string);
    const { membershipId, userRoleId } = subscription.metadata;

    const startDate = new Date(subscription.start_date * NUMBER_OF_MILLISECONDS_IN_SECOND);
    const endDate = new Date(subscription.current_period_end * NUMBER_OF_MILLISECONDS_IN_SECOND);

    await this.membershipAssignmentsService.processMembershipSubscription(membershipId, userRoleId, startDate, endDate);

    const isTrialPeriod = subscription.status === "trialing";

    if (isTrialPeriod) {
      return;
    }

    const membership = await findOneOrFail(membershipId, this.membershipRepository, {
      where: { id: membershipId },
      relations: { membershipPrices: true },
    });
    const userRole = await this.helperService.getUserRoleById(userRoleId, {
      user: true,
      profile: true,
      address: true,
      abnCheck: true,
      paymentInformation: true,
    });

    const membershipPrice = this.getMembershipPrice(membership, userRole);
    const payment = await this.processAndSavePayment(invoice, userRole, membership, membershipPrice);

    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${payment.receipt}`;
    await this.emailsService.sendMembershipPaymentSucceededEmail(
      userRole.profile.contactEmail,
      userRole.profile.firstName,
      membership.type,
      receiptLink,
    );
  }

  public async processAndSavePayment(
    invoice: Stripe.Invoice,
    userRole: UserRole,
    membership: Membership,
    membershipPrice: MembershipPrice,
  ): Promise<Payment> {
    const amountPaid = normalizedAmountToDenormalized(invoice.amount_paid);
    const gstAmount = membershipPrice.gstRate
      ? normalizedAmountToDenormalized(amountPaid * membershipPrice.gstRate)
      : 0;
    const currency = invoice.currency.toUpperCase() as ECurrencies;
    const paymentMethodInfo = `Credit Card ${userRole.paymentInformation?.stripeClientLastFour}`;

    const payment = this.paymentRepository.create({
      fromClient: userRole,
      membershipId: membership.id,
      totalGstAmount: gstAmount,
      totalFullAmount: amountPaid,
      totalAmount: amountPaid - gstAmount,
      system: EPaymentSystem.STRIPE,
      direction: EPaymentDirection.INCOMING,
      paymentMethodInfo,
      currency,
    });
    const membershipReceipt = await this.pdfBuilderService.generateMembershipInvoice(
      payment,
      userRole,
      membership.type,
      currency,
    );
    payment.receipt = membershipReceipt.receiptKey;
    const savedPayment = await this.paymentRepository.save(payment);

    const paymentIntent = await this.stripeService.getPaymentIntent(invoice.payment_intent as string);
    const stripeReceipt = await this.stripeService.getReceipt(paymentIntent.latest_charge as string);

    const stripeReceiptKey = `payments/stripe-receipts/${randomUUID()}.html`;
    await this.awsS3Service.uploadObject(stripeReceiptKey, stripeReceipt as ReadableStream, "text/html");

    const paymentItem = this.paymentItemRepository.create({
      externalId: paymentIntent.id,
      fullAmount: amountPaid,
      amount: amountPaid - gstAmount,
      status: EPaymentStatus.SUCCESS,
      payment: savedPayment,
      receipt: stripeReceiptKey,
      gstAmount,
      currency,
    });
    await this.paymentItemRepository.save(paymentItem);

    return savedPayment;
  }

  public async processMembershipPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await this.stripeService.getSubscription(invoice.subscription as string);
    const { membershipId, userRoleId, userEmail, userFirstName } = subscription.metadata;

    const membership = await findOneOrFail(membershipId, this.membershipRepository, {
      where: { id: membershipId },
      relations: { membershipPrices: true },
    });

    await this.membershipAssignmentRepository.update(
      { userRole: { id: userRoleId } },
      { status: EMembershipAssignmentStatus.PAYMENT_FAILED },
    );

    const amount = normalizedAmountToDenormalized(invoice.amount_due);
    const currency = invoice.currency.toUpperCase() as ECurrencies;
    const invoiceNumber = invoice.number || invoice.id;
    await this.emailsService.sendMembershipPaymentFailedEmail(
      userEmail,
      userFirstName,
      membership.type,
      amount,
      currency,
      invoiceNumber,
    );
  }

  public async processNotifyMembershipChanges(
    membership: Membership,
    membershipAssignment: MembershipAssignment,
    notificationType: EMembershipNotificationType,
    membershipPricingRegion?: EMembershipPricingRegion,
  ): Promise<void> {
    const { userRole } = membershipAssignment.discountHolder;

    if (!userRole) {
      return;
    }

    if (notificationType === EMembershipNotificationType.PRICE_UPDATE) {
      const pricingRegion = userRole.abnCheck ? EMembershipPricingRegion.AU : EMembershipPricingRegion.GLOBAL;

      if (pricingRegion !== membershipPricingRegion) {
        return;
      }

      const membershipPrice = this.getMembershipPrice(membership, userRole);
      await this.emailsService.sendMembershipPriceUpdateEmail(
        userRole.profile.contactEmail,
        userRole.profile.firstName,
        membershipPrice.price,
        membership.type,
      );
    } else if (notificationType === EMembershipNotificationType.DEACTIVATION) {
      await this.emailsService.sendMembershipDeactivationEmail(
        userRole.profile.contactEmail,
        userRole.profile.firstName,
        membershipAssignment.endDate,
        membership.type,
      );
    }
  }

  private getMembershipPrice(membership: Membership, userRole: UserRole): MembershipPrice {
    const pricingRegion = userRole.abnCheck ? EMembershipPricingRegion.AU : EMembershipPricingRegion.GLOBAL;
    const membershipPrice = membership.membershipPrices.find((price) => price.region === pricingRegion);

    if (!membershipPrice) {
      throw new NotFoundException(`Price not found for membership with id: ${membership.id}`);
    }

    return membershipPrice;
  }

  private getTrialEndTimestamp(membership: Membership, discountHolder: DiscountHolder | null): number | undefined {
    if (
      discountHolder &&
      discountHolder.membershipAssignment &&
      discountHolder.membershipAssignment.status === EMembershipAssignmentStatus.ACTIVE
    ) {
      const newMembershipRank = membershipRanking[membership.type];
      const currentMembershipRank = membershipRanking[discountHolder.membershipAssignment.currentMembership.type];

      if (newMembershipRank < currentMembershipRank) {
        return Math.floor(discountHolder.membershipAssignment.endDate.getTime() / NUMBER_OF_MILLISECONDS_IN_SECOND);
      }
    }

    return;
  }
}
