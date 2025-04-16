import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { DiscountHoldersService } from "src/modules/discounts/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { findOneOrFail } from "src/common/utils";
import { ICreateMembershipAssignment, IMembershipDiscountData } from "src/modules/memberships/common/interfaces";
import { isWithinInterval } from "date-fns";
import {
  EMembershipAssignmentStatus,
  EMembershipStatus,
  membershipRanking,
} from "src/modules/memberships/common/enums";
import { Appointment } from "src/modules/appointments/entities";
import { EAppointmentCommunicationType, EAppointmentSchedulingType } from "src/modules/appointments/common/enums";
import { HelperService } from "src/modules/helper/services";
import { QueueInitializeService } from "src/modules/queues/services";
import { UserRole } from "src/modules/users-roles/entities";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class MembershipAssignmentsService {
  private readonly lokiLogger = new LokiLogger(MembershipAssignmentsService.name);
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    @Inject(forwardRef(() => DiscountHoldersService))
    private readonly discountHoldersService: DiscountHoldersService,
    private readonly helperService: HelperService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async getSubscriptionStatus(user: ITokenUserData): Promise<MembershipAssignment> {
    const membershipAssignment = await findOneOrFail(
      user.userRoleId,
      this.membershipAssignmentRepository,
      {
        select: {
          currentMembership: {
            id: true,
            type: true,
          },
          nextMembership: {
            id: true,
            type: true,
          },
        },
        where: { userRole: { id: user.userRoleId } },
        relations: { currentMembership: true, nextMembership: true },
      },
      "user.userRoleId",
    );

    return membershipAssignment;
  }

  public async processMembershipSubscription(
    membershipId: string,
    userRoleId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<void> {
    const existingMembershipAssignment = await this.membershipAssignmentRepository.findOne({
      where: { userRole: { id: userRoleId } },
      relations: { currentMembership: true },
    });
    const membership = await findOneOrFail(membershipId, this.membershipRepository, { where: { id: membershipId } });
    const isStripeProcessed = startDate && endDate;

    if (existingMembershipAssignment) {
      await this.updateMembershipAssignment(membership, existingMembershipAssignment, userRoleId, startDate, endDate);
    } else {
      await this.constructAndCreateMembershipAssignment(membership, userRoleId, startDate, endDate);
    }

    if (isStripeProcessed) {
      await this.processExistingAppointmentsForDiscounts(userRoleId);
    }
  }

  private async updateMembershipAssignment(
    newMembership: Membership,
    existingMembershipAssignment: MembershipAssignment,
    userRoleId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<void> {
    const newMembershipRank = membershipRanking[newMembership.type];
    const currentMembershipRank = membershipRanking[existingMembershipAssignment.currentMembership.type];
    const membershipAssignmentDto = await this.constructMembershipAssignmentDto(
      userRoleId,
      newMembership,
      startDate,
      endDate,
    );

    if (
      existingMembershipAssignment.status !== EMembershipAssignmentStatus.ACTIVE ||
      newMembershipRank === currentMembershipRank
    ) {
      await this.renewMembershipAssignment(existingMembershipAssignment, membershipAssignmentDto);
    } else if (newMembershipRank > currentMembershipRank) {
      await this.upgradeMembershipAssignment(newMembership, existingMembershipAssignment, membershipAssignmentDto);
    } else if (newMembershipRank < currentMembershipRank) {
      await this.downgradeMembershipAssignment(newMembership, existingMembershipAssignment);
    }
  }

  private async renewMembershipAssignment(
    existingMembershipAssignment: MembershipAssignment,
    dto: ICreateMembershipAssignment,
  ): Promise<void> {
    await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, dto);
  }

  private async upgradeMembershipAssignment(
    newMembership: Membership,
    existingMembershipAssignment: MembershipAssignment,
    dto: ICreateMembershipAssignment,
  ): Promise<void> {
    const determinedOnDemandMinutes = existingMembershipAssignment.onDemandMinutes + newMembership.onDemandMinutes;
    const determinedPreBookedMinutes = existingMembershipAssignment.preBookedMinutes + newMembership.preBookedMinutes;

    await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, {
      ...dto,
      onDemandMinutes: determinedOnDemandMinutes,
      preBookedMinutes: determinedPreBookedMinutes,
    });
  }

  private async downgradeMembershipAssignment(
    newMembership: Membership,
    existingMembershipAssignment: MembershipAssignment,
  ): Promise<void> {
    await this.membershipAssignmentRepository.update(existingMembershipAssignment.id, {
      nextMembership: newMembership,
    });
  }

  private async constructAndCreateMembershipAssignment(
    membership: Membership,
    userRoleId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MembershipAssignment> {
    const createMembershipAssignment = await this.constructMembershipAssignmentDto(
      userRoleId,
      membership,
      startDate,
      endDate,
    );
    const savedMembershipAssignment = await this.createMembershipAssignment(createMembershipAssignment);

    const userRole = await this.helperService.getUserRoleById(userRoleId);
    await this.discountHoldersService.createOrUpdateDiscountHolder(userRole, savedMembershipAssignment);

    return savedMembershipAssignment;
  }

  private async createMembershipAssignment(dto: ICreateMembershipAssignment): Promise<MembershipAssignment> {
    const newMembershipAssignment = this.membershipAssignmentRepository.create(dto);
    const savedMembershipAssignment = await this.membershipAssignmentRepository.save(newMembershipAssignment);

    return savedMembershipAssignment;
  }

  private async constructMembershipAssignmentDto(
    userRoleId: string,
    membership: Membership,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ICreateMembershipAssignment> {
    return {
      userRole: { id: userRoleId } as UserRole,
      status: EMembershipAssignmentStatus.ACTIVE,
      discount: membership.discount,
      onDemandMinutes: membership.onDemandMinutes,
      preBookedMinutes: membership.preBookedMinutes,
      currentMembership: membership,
      nextMembership: membership,
      startDate,
      endDate,
    };
  }

  private async processExistingAppointmentsForDiscounts(userRoleId: string): Promise<void> {
    const membershipAssignment = await this.membershipAssignmentRepository.findOne({
      where: { userRole: { id: userRoleId }, status: EMembershipAssignmentStatus.ACTIVE },
      relations: { currentMembership: true },
    });

    if (!membershipAssignment) {
      return;
    }

    const appointments = await this.helperService.getUnpaidAppointmentsForMembershipAssignment(
      userRoleId,
      membershipAssignment,
    );

    await this.queueInitializeService.addProcessExistingAppointmentsForDiscountsQueue(
      appointments,
      membershipAssignment,
    );
  }

  public async applyAppointmentFreeMinutes(
    id: string,
    appointment: Appointment,
    neededMinutes: number,
  ): Promise<number> {
    if (appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      return 0;
    }

    const membershipAssignment = await findOneOrFail(id, this.membershipAssignmentRepository, { where: { id: id } });

    const isOnDemand = appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND;
    const remainingMinutes = isOnDemand ? membershipAssignment.onDemandMinutes : membershipAssignment.preBookedMinutes;
    const freeMinutes = Math.min(neededMinutes, remainingMinutes);

    if (freeMinutes === 0) {
      return 0;
    }

    const minutesToDeduct = -freeMinutes;
    await this.adjustMembershipFreeMinutes(minutesToDeduct, appointment, membershipAssignment);

    return freeMinutes;
  }

  public async returnAppointmentFreeMinutes(appointment: Appointment, membershipFreeMinutes: number): Promise<void> {
    const isRestricted = this.helperService.isAppointmentCancellationRestrictedByTimeLimits(appointment);

    if (!appointment.clientId || isRestricted) {
      return;
    }

    const membershipAssignment = await findOneOrFail(
      appointment.clientId,
      this.membershipAssignmentRepository,
      { where: { userRole: { id: appointment.clientId } } },
      "user.userRoleId",
    );

    await this.adjustMembershipFreeMinutes(membershipFreeMinutes, appointment, membershipAssignment);
  }

  public async deductFreeMinutes(freeMinutes: number, appointment: Appointment): Promise<void> {
    if (!appointment.clientId) {
      return;
    }

    const membershipAssignment = await this.membershipAssignmentRepository.findOne({
      where: { userRole: { id: appointment.clientId } },
    });

    if (membershipAssignment) {
      const minutesToDeduct = -freeMinutes;
      await this.adjustMembershipFreeMinutes(minutesToDeduct, appointment, membershipAssignment);
    }
  }

  private async adjustMembershipFreeMinutes(
    deltaMinutes: number,
    appointment: Appointment,
    membershipAssignment: MembershipAssignment,
  ): Promise<void> {
    const isOnDemand = appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND;
    const updateData: Partial<MembershipAssignment> = isOnDemand
      ? { onDemandMinutes: membershipAssignment.onDemandMinutes + deltaMinutes }
      : { preBookedMinutes: membershipAssignment.preBookedMinutes + deltaMinutes };
    await this.membershipAssignmentRepository.update(membershipAssignment.id, updateData);
  }

  public async calculateAvailableFreeMinutesForBusinessExtensionTimes(
    userRoleId: string,
    businessExtensionTime: number,
    appointment: Appointment,
  ): Promise<number> {
    const membershipAssignment = await this.membershipAssignmentRepository.findOne({
      where: { userRole: { id: userRoleId } },
    });

    if (!membershipAssignment) {
      return 0;
    }

    const isOnDemand = appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND;
    const remainingMinutes = isOnDemand ? membershipAssignment.onDemandMinutes : membershipAssignment.preBookedMinutes;
    const availableMinutes = Math.min(businessExtensionTime, remainingMinutes);

    return availableMinutes;
  }

  public validateMembershipAssignmentAvailability(
    membershipAssignment: MembershipAssignment,
    appointment: Appointment,
  ): boolean {
    const statusesValidStep =
      membershipAssignment.status === EMembershipAssignmentStatus.ACTIVE &&
      membershipAssignment.currentMembership.status === EMembershipStatus.ACTIVE;
    const isAppointmentWithinMembershipInterval = isWithinInterval(appointment.scheduledStartTime, {
      start: membershipAssignment.startDate,
      end: membershipAssignment.endDate,
    });

    return statusesValidStep && isAppointmentWithinMembershipInterval;
  }

  public async deactivateExpiredMemberships(): Promise<void> {
    const result = await this.membershipAssignmentRepository.update(
      {
        status: EMembershipAssignmentStatus.ACTIVE,
        nextMembership: IsNull(),
        endDate: LessThanOrEqual(new Date()),
      },
      {
        status: EMembershipAssignmentStatus.DEACTIVATED,
      },
    );

    if (result.affected) {
      this.lokiLogger.log(`Deactivated ${result.affected} expired memberships`);
    }
  }

  public async fetchMembershipDiscount(id: string, appointment: Appointment): Promise<IMembershipDiscountData> {
    const membershipAssignment = await findOneOrFail(id, this.membershipAssignmentRepository, { where: { id } });
    const freeMinutes = await this.applyAppointmentFreeMinutes(id, appointment, appointment.schedulingDurationMin);

    return {
      freeMinutes,
      discount: membershipAssignment.discount,
    };
  }
}
