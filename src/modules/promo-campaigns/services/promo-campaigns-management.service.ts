import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  GetAllCorporatePromoCampaignsDto,
  GetAllPersonalPromoCampaignsDto,
  PromoCampaignAssignmentDto,
} from "src/modules/promo-campaigns/common/dto";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { Repository } from "typeorm";
import { EPromoCampaignCategory, EPromoCampaignStatus } from "src/modules/promo-campaigns/common/enums";
import { GetAllPromoCampaignsOutput } from "src/modules/promo-campaigns/common/outputs";
import {
  PromoCampaignsQueryOptionsService,
  PromoCampaignsValidationService,
} from "src/modules/promo-campaigns/services";
import { DiscountHoldersService } from "src/modules/discounts/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UsersRolesService } from "src/modules/users-roles/services";
import { findOneOrFail } from "src/common/utils";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES } from "src/common/constants";
import { IPromoCampaignDiscountData } from "src/modules/promo-campaigns/common/interfaces";

@Injectable()
export class PromoCampaignsManagementService {
  constructor(
    @InjectRepository(PromoCampaign)
    private readonly promoCampaignRepository: Repository<PromoCampaign>,
    @Inject(forwardRef(() => DiscountHoldersService))
    private readonly discountHoldersService: DiscountHoldersService,
    private readonly promoCampaignsQueryOptionsService: PromoCampaignsQueryOptionsService,
    private readonly promoCampaignsValidationService: PromoCampaignsValidationService,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async getPersonalPromoCampaigns(dto: GetAllPersonalPromoCampaignsDto): Promise<GetAllPromoCampaignsOutput> {
    const queryBuilder = this.promoCampaignRepository.createQueryBuilder("promoCampaign");
    this.promoCampaignsQueryOptionsService.getPersonalPromoCampaignsOptions(queryBuilder, dto);

    const [promoCampaigns, count] = await queryBuilder.getManyAndCount();

    return {
      data: promoCampaigns,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getCorporatePromoCampaigns(dto: GetAllCorporatePromoCampaignsDto): Promise<GetAllPromoCampaignsOutput> {
    const queryBuilder = this.promoCampaignRepository.createQueryBuilder("promoCampaign");
    this.promoCampaignsQueryOptionsService.getCorporatePromoCampaignsOptions(queryBuilder, dto);

    const [promoCampaigns, count] = await queryBuilder.getManyAndCount();

    return {
      data: promoCampaigns,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async assignPersonalPromoCampaign(dto: PromoCampaignAssignmentDto, user: ITokenUserData): Promise<void> {
    const promoCampaign = await this.promoCampaignRepository.findOne({ where: { promoCode: dto.promoCode } });

    if (!promoCampaign || promoCampaign.category === EPromoCampaignCategory.CORPORATE) {
      throw new BadRequestException("Invalid promo code.");
    }

    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user);
    await this.promoCampaignsValidationService.validatePromoCampaignDiscountHolder(userRole, promoCampaign);
    await this.discountHoldersService.createOrUpdateDiscountHolder(userRole, promoCampaign);
  }

  public async unassignPersonalPromoCampaign(dto: PromoCampaignAssignmentDto, user: ITokenUserData): Promise<void> {
    if (ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role) && !dto.userRoleId) {
      throw new BadRequestException("userRoleId should not be empty.");
    } else if (
      !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role) &&
      dto.userRoleId &&
      dto.userRoleId !== user.userRoleId
    ) {
      throw new ForbiddenException("Forbidden request!");
    }

    const promoCampaign = await findOneOrFail(
      dto.promoCode,
      this.promoCampaignRepository,
      { where: { promoCode: dto.promoCode } },
      "promoCode",
    );
    await this.discountHoldersService.unassignDiscountEntity(dto.userRoleId ?? user.userRoleId, promoCampaign);
  }

  public async togglePromoCampaignStatus(id: string): Promise<void> {
    const promoCampaign = await findOneOrFail(id, this.promoCampaignRepository, { where: { id } });
    const determinedStatus =
      promoCampaign.status === EPromoCampaignStatus.ACTIVE ? EPromoCampaignStatus.PAUSED : EPromoCampaignStatus.ACTIVE;

    await this.promoCampaignRepository.update(id, {
      status: determinedStatus,
    });
  }

  public async removePromoCampaign(id: string): Promise<void> {
    const promoCampaign = await findOneOrFail(id, this.promoCampaignRepository, {
      where: { id },
      relations: { discountAssociations: true },
    });
    await this.promoCampaignRepository.remove(promoCampaign);
  }

  public async removeCorporatePromoCampaign(companyId: string): Promise<void> {
    const promoCampaign = await this.promoCampaignRepository.findOne({
      where: { discountHolders: { company: { id: companyId } } },
      relations: { discountAssociations: true },
    });

    if (promoCampaign) {
      await this.promoCampaignRepository.remove(promoCampaign);
    }
  }

  public async fetchPromoCampaignDiscount(id: string): Promise<IPromoCampaignDiscountData> {
    const promoCampaign = await findOneOrFail(id, this.promoCampaignRepository, {
      where: { id },
      relations: { discountAssociations: true },
    });

    return { discount: promoCampaign.discount, discountMinutes: promoCampaign.discountMinutes };
  }
}
