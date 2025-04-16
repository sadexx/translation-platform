import { BadRequestException, forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DiscountHolder } from "src/modules/discounts/entities";
import { Repository } from "typeorm";
import { PromoCampaign } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Company } from "src/modules/companies/entities";
import { ICreateDiscountHolder, IDiscountResult } from "src/modules/discounts/common/interfaces";
import { DEFAULT_EMPTY_VALUE } from "src/common/constants";
import { PromoCampaignsManagementService, PromoCampaignsValidationService } from "src/modules/promo-campaigns/services";
import { DiscountEntity, DiscountEntityHolder } from "src/modules/discounts/common/types";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { findOneOrFail } from "src/common/utils";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { MembershipAssignmentsService } from "src/modules/memberships/services";
import { Appointment } from "src/modules/appointments/entities";
import { IPromoCampaignDiscountData } from "src/modules/promo-campaigns/common/interfaces";
import { IMembershipDiscountData } from "src/modules/memberships/common/interfaces";

@Injectable()
export class DiscountHoldersService {
  constructor(
    @InjectRepository(DiscountHolder)
    private readonly discountHolderRepository: Repository<DiscountHolder>,
    @Inject(forwardRef(() => MembershipAssignmentsService))
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly promoCampaignsValidationService: PromoCampaignsValidationService,
    private readonly promoCampaignsManagementService: PromoCampaignsManagementService,
  ) {}

  public async createOrUpdateDiscountHolder(
    holder: DiscountEntityHolder,
    discountEntity: DiscountEntity,
  ): Promise<DiscountHolder | null> {
    const existingDiscountHolder = await this.discountHolderRepository.findOne({
      where: [{ userRole: { id: holder.id } }, { company: { id: holder.id } }],
    });
    const discountHolderDto = await this.constructDiscountHolderDto(
      holder,
      discountEntity,
      existingDiscountHolder ?? DEFAULT_EMPTY_VALUE,
    );
    let newDiscountHolder: DiscountHolder | null = null;

    if (existingDiscountHolder) {
      newDiscountHolder = await this.updateDiscountHolder(discountHolderDto, existingDiscountHolder);
    } else {
      newDiscountHolder = await this.createDiscountHolder(discountHolderDto);
    }

    return newDiscountHolder;
  }

  private async updateDiscountHolder(
    dto: ICreateDiscountHolder,
    existingDiscountHolder: DiscountHolder,
  ): Promise<DiscountHolder> {
    await this.discountHolderRepository.update(existingDiscountHolder.id, dto);

    return { ...existingDiscountHolder, ...dto } as DiscountHolder;
  }

  private async createDiscountHolder(dto: ICreateDiscountHolder): Promise<DiscountHolder> {
    const newDiscountHolder = this.discountHolderRepository.create(dto);
    const savedDiscountHolder = await this.discountHolderRepository.save(newDiscountHolder);

    return savedDiscountHolder;
  }

  private async constructDiscountHolderDto(
    holder: DiscountEntityHolder,
    discountEntity: DiscountEntity,
    existingDiscountHolder?: DiscountHolder,
  ): Promise<ICreateDiscountHolder> {
    const determinedHolder = {
      userRole: holder instanceof UserRole ? holder : null,
      company: holder instanceof Company ? holder : null,
    };
    const determinedEntity = {
      promoCampaign: discountEntity instanceof PromoCampaign ? discountEntity : DEFAULT_EMPTY_VALUE,
      membershipAssignment: discountEntity instanceof MembershipAssignment ? discountEntity : DEFAULT_EMPTY_VALUE,
    };

    return {
      ...existingDiscountHolder,
      ...determinedHolder,
      ...determinedEntity,
    };
  }

  public async unassignDiscountEntity(userRoleId: string, discountEntity: DiscountEntity): Promise<void> {
    const discountHolder = await findOneOrFail(
      userRoleId,
      this.discountHolderRepository,
      {
        where: { userRole: { id: userRoleId } },
        relations: { promoCampaign: true, membershipAssignment: true },
      },
      "userRole.id",
    );

    switch (discountEntity.constructor) {
      case PromoCampaign:
        await this.discountHolderRepository.update(discountHolder.id, { promoCampaign: null });
        break;
      case MembershipAssignment:
        await this.discountHolderRepository.update(discountHolder.id, { membershipAssignment: null });
        break;
      default:
        return;
    }
  }

  public async fetchDiscountForAppointment(appointment: Appointment): Promise<IDiscountResult | void> {
    if (!appointment.client) {
      throw new BadRequestException("Appointment has no assigned client.");
    }

    const discountEntities = await this.fetchAvailableDiscountHolderEntities(appointment.client, appointment);

    if (!discountEntities || discountEntities.length === 0) {
      return;
    }

    return this.fetchDiscountsFromEntities(discountEntities, appointment);
  }

  private async fetchAvailableDiscountHolderEntities(
    userRole: UserRole,
    appointment: Appointment,
  ): Promise<DiscountEntity[]> {
    const discountHolder = await this.getDiscountHolderByUserRoleOrCompany(userRole);

    if (!discountHolder) {
      return [];
    }

    const availableDiscountEntities: DiscountEntity[] = [];

    if (discountHolder.promoCampaign) {
      const isPromoCampaignAvailable = await this.promoCampaignsValidationService.validatePromoCampaignAvailability(
        discountHolder.promoCampaign,
        userRole,
      );

      if (isPromoCampaignAvailable) {
        availableDiscountEntities.push(discountHolder.promoCampaign);
      }
    }

    if (discountHolder.membershipAssignment) {
      const isMembershipAssignmentAvailable =
        this.membershipAssignmentsService.validateMembershipAssignmentAvailability(
          discountHolder.membershipAssignment,
          appointment,
        );

      if (isMembershipAssignmentAvailable) {
        availableDiscountEntities.push(discountHolder.membershipAssignment);
      }
    }

    return availableDiscountEntities;
  }

  private async getDiscountHolderByUserRoleOrCompany(userRole: UserRole): Promise<DiscountHolder | null> {
    if (userRole.operatedByCompanyId !== COMPANY_LFH_ID) {
      return this.discountHolderRepository.findOne({
        where: { company: { id: userRole.operatedByCompanyId } },
        relations: {
          promoCampaign: { discountAssociations: { appointment: true } },
          membershipAssignment: { currentMembership: true },
        },
      });
    }

    return this.discountHolderRepository.findOne({
      where: { userRole: { id: userRole.id } },
      relations: {
        promoCampaign: { discountAssociations: { appointment: true } },
        membershipAssignment: { currentMembership: true },
      },
    });
  }

  private async fetchDiscountsFromEntities(
    discountEntities: DiscountEntity[],
    appointment: Appointment,
  ): Promise<IDiscountResult> {
    let promoCampaignDiscountData: IPromoCampaignDiscountData | null = null;
    let membershipDiscountData: IMembershipDiscountData | null = null;
    let promoCampaign: PromoCampaign | null = null;
    let membershipAssignment: MembershipAssignment | null = null;

    for (const discountEntity of discountEntities) {
      if (discountEntity instanceof MembershipAssignment) {
        membershipDiscountData = await this.membershipAssignmentsService.fetchMembershipDiscount(
          discountEntity.id,
          appointment,
        );
        membershipAssignment = discountEntity;
      }

      if (discountEntity instanceof PromoCampaign) {
        promoCampaignDiscountData = await this.promoCampaignsManagementService.fetchPromoCampaignDiscount(
          discountEntity.id,
        );
        promoCampaign = discountEntity;
      }
    }

    return {
      promoCampaignDiscount: promoCampaignDiscountData?.discount ?? null,
      membershipDiscount: membershipDiscountData?.discount ?? null,
      promoCampaignDiscountMinutes: promoCampaignDiscountData?.discountMinutes ?? null,
      membershipFreeMinutes: membershipDiscountData?.freeMinutes ?? null,
      promoCampaign,
      membershipAssignment,
    };
  }
}
