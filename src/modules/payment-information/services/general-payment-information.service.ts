import { BadRequestException, Injectable } from "@nestjs/common";
import { SetDefaultPayOutMethodDto } from "src/modules/payment-information/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { IGetPaymentInfo } from "src/modules/payment-information/common/interfaces";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { COMPANY_PERSONAL_ROLES, INDIVIDUAL_ROLES } from "src/modules/companies/common/constants/constants";
import { findOneOrFail } from "src/common/utils";
import { UserRole } from "src/modules/users-roles/entities";
import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { HelperService } from "src/modules/helper/services";
import { COMPANY_ADMIN_ROLES } from "src/common/constants";

@Injectable()
export class GeneralPaymentInformationService {
  public constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentInformationRepository: Repository<PaymentInformation>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly helperService: HelperService,
  ) {}

  public async setDefaultPaymentMethod(user: ITokenUserData, dto: SetDefaultPayOutMethodDto): Promise<void> {
    let paymentInfo: PaymentInformation | null | undefined = null;

    if (INDIVIDUAL_ROLES.includes(user.role)) {
      paymentInfo = await this.paymentInformationRepository.findOne({
        where: { userRole: { id: user.userRoleId } },
      });
    } else if (COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

      if (!company) {
        throw new BadRequestException("Company not exist!");
      }

      paymentInfo = company.paymentInformation;
    } else {
      throw new BadRequestException("Incorrect role");
    }

    if (!paymentInfo) {
      throw new BadRequestException("Payment information for this user role not find!");
    }

    if (
      paymentInfo.stripeInterpreterOnboardingStatus !== EOnboardingStatus.ONBOARDING_SUCCESS ||
      !paymentInfo.paypalPayerId
    ) {
      throw new BadRequestException("User role don`t have both of paying system");
    }

    await this.paymentInformationRepository.update(
      { id: paymentInfo.id },
      { interpreterSystemForPayout: dto.paymentSystem },
    );

    return;
  }

  public async getPaymentInfo(user: ITokenUserData): Promise<IGetPaymentInfo> {
    let paymentInfo: PaymentInformation | null | undefined = null;

    if (INDIVIDUAL_ROLES.includes(user.role)) {
      paymentInfo = await this.paymentInformationRepository.findOne({
        where: { userRole: { id: user.userRoleId } },
      });
    } else if (COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const company = await this.helperService.getCompanyByRole(user, { paymentInformation: true });

      if (!company) {
        throw new BadRequestException("Company not exist!");
      }

      paymentInfo = company.paymentInformation;
    } else {
      throw new BadRequestException("Incorrect role");
    }

    const data: IGetPaymentInfo = {
      client: {
        last4: paymentInfo?.stripeClientLastFour,
      },
      interpreter: {
        selectedSystemForPayout: paymentInfo?.interpreterSystemForPayout,
        stripe: {
          status: paymentInfo?.stripeInterpreterOnboardingStatus,
          bankAccountLast4: paymentInfo?.stripeInterpreterBankAccountLast4,
          cardLast4: paymentInfo?.stripeInterpreterCardLast4,
        },
        paypal: {
          email: paymentInfo?.paypalEmail,
        },
      },
    };

    return data;
  }

  public async mockPaymentInfo(user: ITokenUserData): Promise<void> {
    let paymentInfo: PaymentInformation | null = null;

    const newPaymentInfoData: DeepPartial<PaymentInformation> = {
      stripeClientAccountId: "cus_RjHFp0dyz4yDok",
      stripeClientPaymentMethodId: "pm_1Qpoh4GbKadJtsaSexEzR4FT",
      stripeClientLastFour: "4242",
      stripeInterpreterAccountId: "acct_1QrIVt2ffgaeDLcK",
      stripeInterpreterOnboardingStatus: EOnboardingStatus.ONBOARDING_SUCCESS,
      stripeInterpreterBankAccountId: "ba_1QrIZE2ffgaeDLcKwt3ncaWe",
      stripeInterpreterBankAccountLast4: "3456",
      stripeInterpreterBankName: "STRIPE TEST BANK",
      interpreterSystemForPayout: EPaymentSystem.STRIPE,
    };

    if (COMPANY_ADMIN_ROLES.includes(user.role)) {
      const company = await this.helperService.getCompanyByRole(user, {});

      if (!company) {
        throw new BadRequestException("Company not exist!");
      }

      paymentInfo = await this.paymentInformationRepository.findOne({ where: { company: { id: company.id } } });

      newPaymentInfoData.company = company;
    } else {
      paymentInfo = await this.paymentInformationRepository.findOne({ where: { userRole: { id: user.userRoleId } } });

      const userRole = await findOneOrFail("id", this.userRoleRepository, { where: { id: user.userRoleId } });

      newPaymentInfoData.userRole = userRole;
    }

    if (paymentInfo) {
      await this.paymentInformationRepository.update({ id: paymentInfo.id }, newPaymentInfoData);
    } else {
      const newPaymentInfo = this.paymentInformationRepository.create(newPaymentInfoData);

      await this.paymentInformationRepository.save(newPaymentInfo);
    }

    return;
  }
}
