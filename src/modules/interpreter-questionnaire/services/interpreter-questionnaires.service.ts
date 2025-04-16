import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersRolesService } from "src/modules/users-roles/services";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { InterpreterQuestionnaire } from "src/modules/interpreter-questionnaire/entities";
import {
  CreateInterpreterQuestionnaireDto,
  CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
  GetInterpreterQuestionnaireDto,
  UpdateInterpreterQuestionnaireDto,
} from "src/modules/interpreter-questionnaire/common/dto";
import { EInterpreterCertificateType, EInterpreterType } from "src/modules/interpreter-profile/common/enum";
import { IInterpreterProfile } from "src/modules/interpreter-profile/common/interface";
import { UserRole } from "src/modules/users-roles/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class InterpreterQuestionnaireService {
  constructor(
    @InjectRepository(InterpreterQuestionnaire)
    private readonly interpreterQuestionnaireRepository: Repository<InterpreterQuestionnaire>,
    private readonly usersRolesService: UsersRolesService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly helperService: HelperService,
  ) {}

  public async create(user: ITokenUserData, dto: CreateInterpreterQuestionnaireDto): Promise<MessageOutput> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForQuestionnaire(
      dto,
      user,
      ROLES_CAN_EDIT_NOT_OWN_PROFILES,
    );

    if (userRole.questionnaire) {
      throw new BadRequestException("Questionnaire is already created");
    }

    this.helperService.validateWWCCRequirements(dto, user, userRole);

    const questionnaire = this.interpreterQuestionnaireRepository.create({
      userRoleId: userRole.id,
      experienceYears: dto.experienceYears,
    });

    await this.interpreterQuestionnaireRepository.save(questionnaire);

    await this.createOrUpdateInterpreterProfile(userRole, dto);

    await this.activationTrackingService.checkStepsEnded(user);

    return { message: "Questionnaire created successfully." };
  }

  public async createServices(
    user: ITokenUserData,
    dto: CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
  ): Promise<MessageOutput> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForQuestionnaire(
      dto,
      user,
      ROLES_CAN_EDIT_NOT_OWN_PROFILES,
    );

    if (userRole.questionnaire) {
      throw new BadRequestException("Questionnaire is already created");
    }

    const questionnaire = this.interpreterQuestionnaireRepository.create({
      userRoleId: userRole.id,
    });

    await this.interpreterQuestionnaireRepository.save(questionnaire);

    await this.createOrUpdateInterpreterProfile(userRole, dto);

    await this.activationTrackingService.checkStepsEnded(user);

    return { message: "Questionnaire created successfully." };
  }

  public async findOneByUserIdAndRole(
    dto: GetInterpreterQuestionnaireDto,
    user: ITokenUserData,
  ): Promise<InterpreterQuestionnaire> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForQuestionnaire(
      dto,
      user,
      ROLES_CAN_GET_NOT_OWN_PROFILES,
    );

    const questionnaire = await this.interpreterQuestionnaireRepository.findOne({
      where: { userRoleId: userRole.id },
      relations: {
        recommendations: true,
      },
    });

    if (!questionnaire) {
      throw new NotFoundException("Can't find questionnaire with such user id and role");
    }

    return questionnaire;
  }

  public async update(user: ITokenUserData, dto: UpdateInterpreterQuestionnaireDto): Promise<MessageOutput> {
    await this.usersRolesService.getValidatedUserRoleForQuestionnaire(dto, user, ROLES_CAN_EDIT_NOT_OWN_PROFILES);

    const questionnaire = await this.findOneByUserIdAndRole(
      dto.userRoleId ? { userRoleId: dto.userRoleId } : { userRoleId: undefined },
      user,
    );

    if (dto.experienceYears) {
      questionnaire.experienceYears = dto.experienceYears;
    }

    await this.interpreterQuestionnaireRepository.save(questionnaire);

    await this.activationTrackingService.checkStepsEnded(user);

    return { message: "Questionnaire updated successfully." };
  }

  public async createOrUpdateInterpreterProfile(
    userRole: UserRole,
    dto: CreateInterpreterQuestionnaireDto | CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
  ): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.OTHER,
      knownLanguages: [],
      audioOnDemandSetting: dto.audioOnDemandSetting,
      videoOnDemandSetting: dto.videoOnDemandSetting,
      faceToFaceOnDemandSetting: dto.faceToFaceOnDemandSetting,
      audioPreBookedSetting: dto.audioPreBookedSetting,
      videoPreBookedSetting: dto.videoPreBookedSetting,
      faceToFacePreBookedSetting: dto.faceToFacePreBookedSetting,
    };

    if (dto instanceof CreateInterpreterQuestionnaireDto) {
      Object.assign(interpreterProfile, {
        consecutiveLegalSetting: dto.consecutiveLegalSetting,
        consecutiveMedicalSetting: dto.consecutiveMedicalSetting,
        conferenceSimultaneousSetting: dto.conferenceSimultaneousSetting,
        signLanguageSetting: dto.signLanguageSetting,
        consecutiveGeneralSetting: dto.consecutiveGeneralSetting,
      });
    }

    if (dto instanceof CreateInterpreterQuestionnaireServicesLanguageBuddyDto) {
      Object.assign(interpreterProfile, {
        consecutiveGeneralSetting: dto.consecutiveGeneralSetting,
      });
    }

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole, interpreterProfile);
  }
}
