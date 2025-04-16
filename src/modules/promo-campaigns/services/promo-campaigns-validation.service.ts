import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CreateCorporatePromoCampaignDto,
  CreatePersonalPromoCampaignDto,
} from "src/modules/promo-campaigns/common/dto";
import { endOfDay, isAfter, isBefore, isWithinInterval, startOfDay } from "date-fns";
import { Repository } from "typeorm";
import { Company } from "src/modules/companies/entities";
import { DiscountEntityHolder } from "src/modules/discounts/common/types";
import { UserRole } from "src/modules/users-roles/entities";
import {
  EPromoCampaignCategory,
  EPromoCampaignStatus,
  EPromoCampaignType,
} from "src/modules/promo-campaigns/common/enums";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { HelperService } from "src/modules/helper/services";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { DiscountAssociation } from "src/modules/discounts/entities";

@Injectable()
export class PromoCampaignsValidationService {
  constructor(
    @InjectRepository(PromoCampaign)
    private readonly promoCampaignRepository: Repository<PromoCampaign>,
    private readonly helperService: HelperService,
  ) {}

  public async validatePromoCampaignUniqueness(
    dto: CreatePersonalPromoCampaignDto | CreateCorporatePromoCampaignDto,
  ): Promise<void> {
    const existingPromo = await this.promoCampaignRepository.findOne({
      where: [{ name: dto.name }, { promoCode: dto.promoCode }],
    });

    if (existingPromo) {
      throw new BadRequestException("A promo campaign with this name or promo code already exists.");
    }
  }

  public async validatePromoCampaignDiscountHolder(
    holder: DiscountEntityHolder,
    promoCampaign?: PromoCampaign,
  ): Promise<void> {
    const existingDiscountHolder = await this.helperService.getDiscountHolderForValidation(holder, promoCampaign);

    if (!existingDiscountHolder) {
      return;
    }

    const { userRole, company } = existingDiscountHolder;

    if (holder instanceof UserRole) {
      if (promoCampaign?.category === EPromoCampaignCategory.PERSONAL && userRole && userRole.id !== holder.id) {
        throw new BadRequestException("This promo campaign is already assigned to another user.");
      }
    }

    if (holder instanceof Company) {
      if (company) {
        throw new BadRequestException({
          message: "This company has already assigned promo campaign.",
          isPromoAssigned: true,
        });
      }
    }
  }

  public async validatePromoCampaignAvailability(promoCampaign: PromoCampaign, userRole: UserRole): Promise<boolean> {
    const statusValidStep = promoCampaign.status === EPromoCampaignStatus.ACTIVE;
    const durationValidStep = this.validatePromoCampaignAvailabilityDurationStep(promoCampaign);
    let isAvailable = statusValidStep && durationValidStep;

    if (promoCampaign.type === EPromoCampaignType.MIXED) {
      const dailyLimitValid = await this.validateMixedPromoCampaignDailyLimit(promoCampaign, userRole);
      isAvailable = isAvailable && dailyLimitValid;
    }

    return isAvailable;
  }

  private validatePromoCampaignAvailabilityDurationStep(promoCampaign: PromoCampaign): boolean {
    if (promoCampaign.startDate && promoCampaign.endDate) {
      const currentDate = new Date();

      return isAfter(currentDate, promoCampaign.startDate) && isBefore(currentDate, promoCampaign.endDate);
    }

    return true;
  }

  private async validateMixedPromoCampaignDailyLimit(
    promoCampaign: PromoCampaign,
    userRole: UserRole,
  ): Promise<boolean> {
    if (!promoCampaign.discountAssociations || promoCampaign.discountAssociations.length === 0) {
      return true;
    }

    const usedToday = promoCampaign.discountAssociations.filter((discountAssociation) =>
      this.isDiscountAssociationValidForToday(discountAssociation, userRole),
    );

    return usedToday.length === 0;
  }

  public isDiscountAssociationValidForToday(discountAssociation: DiscountAssociation, userRole: UserRole): boolean {
    const identifierId = userRole.operatedByCompanyId !== COMPANY_LFH_ID ? userRole.operatedByCompanyId : userRole.id;
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    return (
      isWithinInterval(discountAssociation.creationDate, { start: todayStart, end: todayEnd }) &&
      (discountAssociation.appointment.clientId === identifierId ||
        discountAssociation.appointment.operatedByCompanyId === identifierId)
    );
  }
}
