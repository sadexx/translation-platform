import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { Repository } from "typeorm";
import { PromoCampaignsManagementService, PromoCampaignsValidationService } from "src/modules/promo-campaigns/services";
import { DiscountHoldersService } from "src/modules/discounts/services";
import { HelperService } from "src/modules/helper/services";
import {
  CreatePersonalPromoCampaignDto,
  CreatePersonalMixedPromo,
  CreateCorporatePromoCampaignDto,
  CreateCorporateMixedPromo,
} from "src/modules/promo-campaigns/common/dto";
import {
  EPromoCampaignType,
  EPromoCampaignDurationPeriod,
  EPromoCampaignCategory,
  EPromoCampaignStatus,
} from "src/modules/promo-campaigns/common/enums";
import { ICreatePromoCampaign } from "src/modules/promo-campaigns/common/interfaces";
import { PromoCampaignDto } from "src/modules/promo-campaigns/common/types";

@Injectable()
export class PromoCampaignsCreationService {
  constructor(
    @InjectRepository(PromoCampaign)
    private readonly promoCampaignRepository: Repository<PromoCampaign>,
    @Inject(forwardRef(() => DiscountHoldersService))
    private readonly discountHoldersService: DiscountHoldersService,
    private readonly promoCampaignsManagementService: PromoCampaignsManagementService,
    private readonly promoCampaignsValidationService: PromoCampaignsValidationService,
    private readonly helperService: HelperService,
  ) {}

  public async createPersonalPromoCampaign(dto: CreatePersonalPromoCampaignDto): Promise<PromoCampaign> {
    const promoCampaign = await this.createPersonalPromoCampaignInternal(dto, EPromoCampaignType.REGULAR);

    return promoCampaign;
  }

  public async createPersonalMixedPromoCampaign(dto: CreatePersonalMixedPromo): Promise<PromoCampaign> {
    const promoCampaign = await this.createPersonalPromoCampaignInternal(dto, EPromoCampaignType.MIXED);

    return promoCampaign;
  }

  public async createCorporatePromoCampaign(dto: CreateCorporatePromoCampaignDto): Promise<PromoCampaign> {
    const promoCampaign = await this.createCorporatePromoCampaignInternal(dto, EPromoCampaignType.REGULAR);

    return promoCampaign;
  }

  public async createCorporateMixedPromoCampaign(dto: CreateCorporateMixedPromo): Promise<PromoCampaign> {
    const promoCampaign = await this.createCorporatePromoCampaignInternal(dto, EPromoCampaignType.MIXED);

    return promoCampaign;
  }

  private async createPersonalPromoCampaignInternal(
    dto: CreatePersonalPromoCampaignDto | CreatePersonalMixedPromo,
    type: EPromoCampaignType,
  ): Promise<PromoCampaign> {
    await this.promoCampaignsValidationService.validatePromoCampaignUniqueness(dto);

    return await this.constructAndCreatePromoCampaign(dto, type);
  }

  private async createCorporatePromoCampaignInternal(
    dto: CreateCorporatePromoCampaignDto | CreateCorporateMixedPromo,
    type: EPromoCampaignType,
  ): Promise<PromoCampaign> {
    await this.promoCampaignsValidationService.validatePromoCampaignUniqueness(dto);
    const company = await this.helperService.getCompanyById(dto.companyId);

    if (dto.validateHolder) {
      await this.promoCampaignsValidationService.validatePromoCampaignDiscountHolder(company);
    }

    await this.promoCampaignsManagementService.removeCorporatePromoCampaign(dto.companyId);
    const promoCampaign = await this.constructAndCreatePromoCampaign(dto, type);
    await this.discountHoldersService.createOrUpdateDiscountHolder(company, promoCampaign);

    return promoCampaign;
  }

  private async constructAndCreatePromoCampaign(
    dto: PromoCampaignDto,
    type: EPromoCampaignType,
  ): Promise<PromoCampaign> {
    const createPromoCampaign = await this.constructPromoCampaignDto(dto, type);
    const savedPromoCampaign = await this.createPromoCampaign(createPromoCampaign);

    return savedPromoCampaign;
  }

  private async createPromoCampaign(dto: ICreatePromoCampaign): Promise<PromoCampaign> {
    const newPromoCampaign = this.promoCampaignRepository.create(dto);
    const savedPromoCampaign = await this.promoCampaignRepository.save(newPromoCampaign);

    return savedPromoCampaign;
  }

  private async constructPromoCampaignDto(
    dto: PromoCampaignDto,
    type: EPromoCampaignType,
  ): Promise<ICreatePromoCampaign> {
    const determinedDurationPeriod =
      dto.startDate && dto.endDate ? EPromoCampaignDurationPeriod.LIMITED : EPromoCampaignDurationPeriod.ALWAYS;
    const determinedCategory =
      dto instanceof CreatePersonalPromoCampaignDto ? dto.category : EPromoCampaignCategory.CORPORATE;
    const determinedDiscountMinutes =
      dto instanceof CreatePersonalMixedPromo || dto instanceof CreateCorporateMixedPromo ? dto.discountMinutes : null;

    return {
      ...dto,
      type,
      discountMinutes: determinedDiscountMinutes,
      category: determinedCategory,
      status: EPromoCampaignStatus.ACTIVE,
      durationPeriod: determinedDurationPeriod,
    };
  }
}
