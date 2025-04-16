import { BadRequestException, Injectable } from "@nestjs/common";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GetSumSubAccessTokenQueryDto, GetSumSubQueryDto } from "src/modules/sumsub/common/dto";
import {
  EExtSumSubApplicantType,
  EExtSumSubLevelName,
  EExtSumSubReviewAnswer,
  EExtSumSubReviewStatus,
  EExtSumSubWebhookType,
} from "src/modules/sumsub/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { randomUUID } from "node:crypto";
import { UsersRolesService } from "src/modules/users-roles/services";
import { ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { SumSubSdkService } from "src/modules/sumsub/services";
import { GetUserAccessTokenOutput } from "src/modules/sumsub/common/outputs";
import { findOneOrFail } from "src/common/utils";

@Injectable()
export class SumSubService {
  constructor(
    @InjectRepository(SumSubCheck)
    private readonly sumSubCheckRepository: Repository<SumSubCheck>,
    private readonly sumSubSdkService: SumSubSdkService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async getUserAccessToken(
    user: ITokenUserData,
    dto: GetSumSubAccessTokenQueryDto,
  ): Promise<GetUserAccessTokenOutput> {
    const token = await this.sumSubSdkService.fetchAccessToken(user.userRoleId, dto.levelName);

    return { token };
  }

  public async getAll(dto: GetSumSubQueryDto): Promise<SumSubCheck[]> {
    const sumSubChecks = await this.sumSubCheckRepository.find({
      take: dto.limit,
      skip: dto.offset,
      order: {
        creationDate: dto.sortOrder,
      },
    });

    return sumSubChecks;
  }

  public async getUserStatus(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<SumSubCheck | null> {
    const { userRoleId, role: userRoleName } = user;

    if (!userRoleId) {
      throw new BadRequestException("User not found");
    }

    let result: SumSubCheck | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      if (!dto?.id) {
        throw new BadRequestException("Set SumSub check id!");
      }

      result = await this.sumSubCheckRepository.findOne({ where: { id: dto.id }, relations: { userRole: true } });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      result = await this.sumSubCheckRepository.findOne({
        where: {
          userRole: { id: userRoleId, role: { name: userRoleName } },
        },
        relations: {
          userRole: true,
        },
      });
    }

    if (result) {
      await this.usersRolesService.validateCompanyAdminForUserRole(user, result.userRole);
    }

    return result;
  }

  public async removeSumSubCheck(id: string): Promise<void> {
    const sumSubCheck = await findOneOrFail(id, this.sumSubCheckRepository, {
      where: { id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    await this.sumSubSdkService.resetApplicant(sumSubCheck.applicantId);
    await this.sumSubCheckRepository.remove(sumSubCheck);

    return;
  }

  public async mockSumSub(user: ITokenUserData): Promise<{
    id: string;
  }> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(userId, userRoleName, {
      profile: true,
      backyCheck: true,
    });

    if (userRole?.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    const sumSubCheck = this.sumSubCheckRepository.create({
      userRole,
      applicantId: randomUUID(),
      inspectionId: randomUUID(),
      applicantType: EExtSumSubApplicantType.INDIVIDUAL,
      correlationId: randomUUID(),
      levelName: EExtSumSubLevelName.AUSTRALIA_OR_NZ_CITIZENS,
      externalUserId: userId,
      webhookType: EExtSumSubWebhookType.APPLICANT_REVIEWED,
      reviewStatus: EExtSumSubReviewStatus.COMPLETED,
      reviewAnswer: EExtSumSubReviewAnswer.GREEN,
    });
    const newSumSubCheck = await this.sumSubCheckRepository.save(sumSubCheck);

    await this.activationTrackingService.checkStepsEnded(user);

    return { id: newSumSubCheck.id };
  }
}
