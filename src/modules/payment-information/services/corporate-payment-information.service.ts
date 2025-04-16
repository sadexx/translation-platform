import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import Stripe from "stripe";
import { StripeService } from "src/modules/stripe/services";
import {
  AddPaypalAccountForPayOutDto,
  AttachPaymentMethodToStripeForPayInDto,
} from "src/modules/payment-information/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { IAttachPaymentMethodToCustomer } from "src/modules/stripe/common/interfaces";
import {
  IAccountLink,
  ICreateStripeCustomerForPayIn,
  ILoginLink,
} from "src/modules/payment-information/common/interfaces";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { PaypalSdkService } from "src/modules/paypal/services";
import { IProfileInformationResponse } from "src/modules/paypal/common/interfaces";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class CorporatePaymentInformationService {
  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    private readonly stripeService: StripeService,
    private readonly paypalSdkService: PaypalSdkService,
    private readonly helperService: HelperService,
  ) {}

  /*
   * Corporate client, pay in, stripe
   */

  public async createStripeCustomerForPayIn(user: ITokenUserData): Promise<ICreateStripeCustomerForPayIn> {
    const company = await this.helperService.getCompanyByRole(user, {});

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    let customerInfo: IAttachPaymentMethodToCustomer | null = null;

    try {
      customerInfo = await this.stripeService.createCustomer(company.contactEmail, company.platformId, true, true);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    return { clientSecret: customerInfo?.clientSecret, customerId: customerInfo.customerId };
  }

  public async attachBankAccountToStripeCustomerForPayIn(
    user: ITokenUserData,
    dto: AttachPaymentMethodToStripeForPayInDto,
  ): Promise<void> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    try {
      await this.stripeService.attachPaymentMethodToCustomer(dto.paymentMethodId, dto.customerId);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    if (company.paymentInformation) {
      await this.paymentInformationRepository.update(
        { id: company.paymentInformation.id },
        {
          stripeClientPaymentMethodId: dto.paymentMethodId,
          stripeClientAccountId: dto.customerId,
          stripeClientLastFour: dto.lastFour,
        },
      );
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        stripeClientPaymentMethodId: dto.paymentMethodId,
        stripeClientAccountId: dto.customerId,
        stripeClientLastFour: dto.lastFour,
        company,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }
  }

  public async deleteStripeForPayIn(user: ITokenUserData): Promise<void> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.paymentInformation) {
      throw new BadRequestException("Company payment information not filled!");
    }

    await this.paymentInformationRepository.update(
      { company: { id: company.id } },
      {
        stripeClientPaymentMethodId: null,
        stripeClientAccountId: null,
        stripeClientLastFour: null,
      },
    );
  }

  /*
   * Corporate interpreter, pay out, stripe
   */

  public async createStripeAccountForPayOut(user: ITokenUserData): Promise<IAccountLink> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (
      company.paymentInformation &&
      company.paymentInformation.stripeInterpreterAccountId &&
      company.paymentInformation.stripeInterpreterOnboardingStatus
    ) {
      const onboardingStatus = company.paymentInformation.stripeInterpreterOnboardingStatus;

      if (
        onboardingStatus === EOnboardingStatus.NEED_DOCUMENTS ||
        onboardingStatus === EOnboardingStatus.DOCUMENTS_PENDING ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS
      ) {
        throw new BadRequestException("Company already onboarded!");
      }

      if (
        onboardingStatus === EOnboardingStatus.ACCOUNT_CREATED ||
        onboardingStatus === EOnboardingStatus.ONBOARDING_STARTED
      ) {
        try {
          const accountLink = await this.stripeService.createAccountLink(
            company.paymentInformation.stripeInterpreterAccountId,
            true,
          );

          return { accountLink: accountLink.url };
        } catch (error) {
          throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
        }
      }
    }

    let account: { accountId: string } | null = null;
    let accountLink: Stripe.Response<Stripe.AccountLink> | null = null;

    try {
      account = await this.stripeService.createAccount();

      accountLink = await this.stripeService.createAccountLink(account.accountId, true);
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }

    if (company.paymentInformation) {
      await this.paymentInformationRepository.update(
        { id: company.paymentInformation.id },
        {
          stripeInterpreterAccountId: account.accountId,
          stripeInterpreterOnboardingStatus: EOnboardingStatus.ACCOUNT_CREATED,
        },
      );
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        stripeInterpreterAccountId: account.accountId,
        stripeInterpreterOnboardingStatus: EOnboardingStatus.ACCOUNT_CREATED,
        company,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    return { accountLink: accountLink.url };
  }

  public async createStripeLoginLinkForPayOut(user: ITokenUserData): Promise<ILoginLink> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.paymentInformation) {
      throw new BadRequestException("User role payment info not fill!");
    }

    if (!company.paymentInformation.stripeInterpreterAccountId) {
      throw new BadRequestException("User role stripe account id not exist!");
    }

    try {
      const loginLink = await this.stripeService.createLoginLink(company.paymentInformation.stripeInterpreterAccountId);

      return loginLink;
    } catch (error) {
      throw new UnprocessableEntityException((error as Stripe.Response<Stripe.StripeRawError>).message);
    }
  }

  public async deleteStripeForPayOut(user: ITokenUserData): Promise<void> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.paymentInformation) {
      throw new BadRequestException("User role payment information not filled!");
    }

    let interpreterSystemForPayout: EPaymentSystem | null = null;

    if (company.paymentInformation.paypalPayerId) {
      interpreterSystemForPayout = EPaymentSystem.PAYPAL;
    }

    await this.paymentInformationRepository.update(
      { company: { id: company.id } },
      {
        stripeInterpreterAccountId: null,
        stripeInterpreterCardId: null,
        stripeInterpreterCardLast4: null,
        stripeInterpreterCardBrand: null,
        stripeInterpreterBankName: null,
        stripeInterpreterBankAccountId: null,
        stripeInterpreterBankAccountLast4: null,
        stripeInterpreterOnboardingStatus: null,
        interpreterSystemForPayout,
      },
    );
  }

  /*
   * Corporate interpreter, pay out, paypal
   */

  public async createPaypalForPayOut(user: ITokenUserData, dto: AddPaypalAccountForPayOutDto): Promise<void> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.contactEmail) {
      throw new BadRequestException("Company contact email not filled!");
    }

    let profile: IProfileInformationResponse | null = null;

    try {
      profile = await this.paypalSdkService.getClientProfile(dto.code);
    } catch (error) {
      throw new UnprocessableEntityException((error as Error).message);
    }

    if (!profile.payer_id) {
      throw new BadRequestException("Paypal profile does not have payer id!");
    }

    const updateData: DeepPartial<PaymentInformation> = {
      paypalPayerId: profile.payer_id,
      paypalEmail: profile.email,
      paypalAccountVerified: profile.verified_account,
    };

    if (company.paymentInformation?.stripeInterpreterOnboardingStatus !== EOnboardingStatus.ONBOARDING_SUCCESS) {
      updateData.interpreterSystemForPayout = EPaymentSystem.PAYPAL;
    }

    if (company.paymentInformation) {
      await this.paymentInformationRepository.update({ id: company.paymentInformation.id }, updateData);
    } else {
      const paymentInformation = this.paymentInformationRepository.create({
        ...updateData,
        company,
      });

      await this.paymentInformationRepository.save(paymentInformation);
    }

    return;
  }

  public async deletePaypalForPayOut(user: ITokenUserData): Promise<void> {
    const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.paymentInformation) {
      throw new BadRequestException("Company payment information not filled!");
    }

    let interpreterSystemForPayout: EPaymentSystem | null = null;

    if (company.paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS) {
      interpreterSystemForPayout = EPaymentSystem.STRIPE;
    }

    await this.paymentInformationRepository.update(
      { company: { id: company.id } },
      {
        paypalEmail: null,
        paypalPayerId: null,
        paypalAccountVerified: null,
        interpreterSystemForPayout,
      },
    );
  }
}
