import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/entities";
import { DiscountHoldersService } from "src/modules/discounts/services";
import { DiscountAssociation } from "src/modules/discounts/entities";
import { Repository } from "typeorm";
import { ICreateDiscountAssociation, IDiscountRate, IDiscountResult } from "src/modules/discounts/common/interfaces";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { MembershipAssignmentsService } from "src/modules/memberships/services";
import { CANCELLED_APPOINTMENT_STATUSES } from "src/modules/appointments-shared/common/constants";

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(DiscountAssociation)
    private readonly discountAssociationRepository: Repository<DiscountAssociation>,
    @Inject(forwardRef(() => MembershipAssignmentsService))
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly discountHoldersService: DiscountHoldersService,
  ) {}

  public async createAppointmentDiscountAssociation(appointment: Appointment): Promise<void> {
    const discountForAppointment = await this.discountHoldersService.fetchDiscountForAppointment(appointment);

    if (discountForAppointment) {
      await this.constructAndCreateDiscountAssociation(appointment, discountForAppointment);
    }
  }

  private async constructAndCreateDiscountAssociation(
    appointment: Appointment,
    discountForAppointment: IDiscountResult,
  ): Promise<void> {
    const createDiscountAssociation = await this.constructDiscountAssociationDto(appointment, discountForAppointment);
    await this.createDiscountAssociation(createDiscountAssociation);
  }

  private async constructDiscountAssociationDto(
    appointment: Appointment,
    discountForAppointment: IDiscountResult,
  ): Promise<ICreateDiscountAssociation> {
    return {
      appointment,
      promoCampaignDiscount: discountForAppointment.promoCampaignDiscount,
      membershipDiscount: discountForAppointment.membershipDiscount,
      promoCampaignDiscountMinutes: discountForAppointment.promoCampaignDiscountMinutes,
      membershipFreeMinutes: discountForAppointment.membershipFreeMinutes,
      promoCode: discountForAppointment.promoCampaign?.promoCode ?? null,
      membershipType: discountForAppointment.membershipAssignment?.currentMembership.type ?? null,
      promoCampaign: discountForAppointment.promoCampaign,
      membershipAssignment: discountForAppointment.membershipAssignment,
    };
  }

  private async createDiscountAssociation(dto: ICreateDiscountAssociation): Promise<void> {
    const newDiscountAssociation = this.discountAssociationRepository.create(dto);
    await this.discountAssociationRepository.save(newDiscountAssociation);
  }

  public async processDiscountAssociationIfExists(appointmentId: string): Promise<void> {
    const discountAssociation = await this.discountAssociationRepository.findOne({
      where: { appointment: { id: appointmentId } },
      relations: { promoCampaign: true, membershipAssignment: true, appointment: true },
    });

    if (discountAssociation) {
      await this.processDiscountAssociationDependencies(discountAssociation);
    }
  }

  private async processDiscountAssociationDependencies(discountAssociation: DiscountAssociation): Promise<void> {
    const { appointment } = discountAssociation;

    if (discountAssociation.membershipFreeMinutes && CANCELLED_APPOINTMENT_STATUSES.includes(appointment.status)) {
      await this.membershipAssignmentsService.returnAppointmentFreeMinutes(
        appointment,
        discountAssociation.membershipFreeMinutes,
      );
      await this.discountAssociationRepository.update(discountAssociation.id, {
        membershipFreeMinutes: 0,
      });
    }
  }

  public async createOrUpdateDiscountAssociation(
    appointment: Appointment,
    membershipAssignment: MembershipAssignment,
  ): Promise<void> {
    if (appointment.discountAssociation) {
      await this.updateDiscountAssociation(appointment, appointment.discountAssociation, membershipAssignment);
    } else {
      await this.createAppointmentDiscountAssociation(appointment);
    }
  }

  private async updateDiscountAssociation(
    appointment: Appointment,
    discountAssociation: DiscountAssociation,
    membershipAssignment: MembershipAssignment,
  ): Promise<void> {
    let neededMinutes = appointment.schedulingDurationMin;

    if (discountAssociation.membershipFreeMinutes && discountAssociation.membershipFreeMinutes > 0) {
      neededMinutes = Math.max(0, appointment.schedulingDurationMin - discountAssociation.membershipFreeMinutes);
    }

    const freeMinutes = await this.membershipAssignmentsService.applyAppointmentFreeMinutes(
      membershipAssignment.id,
      appointment,
      neededMinutes,
    );
    const determinedMembershipFreeMinutes = (discountAssociation.membershipFreeMinutes ?? 0) + freeMinutes;

    await this.discountAssociationRepository.update(discountAssociation.id, {
      membershipDiscount: membershipAssignment.discount,
      membershipFreeMinutes: determinedMembershipFreeMinutes,
      membershipType: membershipAssignment.currentMembership.type,
      membershipAssignment,
    });
  }

  public async fetchDiscountRate(appointmentId: string): Promise<IDiscountRate | void> {
    const discountAssociation = await this.discountAssociationRepository.findOne({
      where: { appointment: { id: appointmentId } },
    });

    if (!discountAssociation) {
      return;
    }

    return {
      promoCampaignDiscount: discountAssociation.promoCampaignDiscount,
      membershipDiscount: discountAssociation.membershipDiscount,
      promoCampaignDiscountMinutes: discountAssociation.promoCampaignDiscountMinutes,
      membershipFreeMinutes: discountAssociation.membershipFreeMinutes,
      promoCode: discountAssociation.promoCode,
      membershipType: discountAssociation.membershipType,
    };
  }
}
