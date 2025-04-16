import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomInsurance, InterpreterProfile, LanguagePair } from "src/modules/interpreter-profile/entities";
import { IInterpreterProfile } from "src/modules/interpreter-profile/common/interface";
import { UserRole } from "src/modules/users-roles/entities";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";
import { ELanguageLevel, ELanguages } from "src/modules/interpreter-profile/common/enum";
import {
  CreateLanguagePairDto,
  CustomInsuranceDto,
  SetInterpreterOnlineDto,
  UpdateInterpreterProfileDto,
} from "src/modules/interpreter-profile/common/dto";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { UsersRolesService } from "src/modules/users-roles/services";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { OptionalUUIDParamDto } from "src/common/dto";
import { isUUID } from "validator";
import { OrderEventDto } from "src/modules/web-socket-gateway/common/dto";
import { addMonths } from "date-fns";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { MessageOutput } from "src/common/outputs";
import { findOneOrFail } from "src/common/utils";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";

export class InterpreterProfileService {
  private readonly lokiLogger = new LokiLogger(InterpreterProfileService.name);
  constructor(
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(CustomInsurance)
    private readonly customInsuranceRepository: Repository<CustomInsurance>,
    @InjectRepository(LanguagePair)
    private readonly languagePairRepository: Repository<LanguagePair>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly usersRolesService: UsersRolesService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly helperService: HelperService,
  ) {}

  public async getInterpreterProfile(user: ITokenUserData): Promise<InterpreterProfile> {
    const interpreterProfile = await findOneOrFail(user.userRoleId, this.interpreterProfileRepository, {
      where: { userRole: { id: user.userRoleId } },
    });

    return interpreterProfile;
  }

  public async getLanguagePairs(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<LanguagePair[] | null> {
    let result: LanguagePair[] | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      if (!dto?.id) {
        throw new BadRequestException("Set interpreter profile id!");
      }

      result = await this.languagePairRepository.find({
        where: { interpreterProfile: { id: dto.id } },
      });
    } else {
      result = await this.languagePairRepository.find({
        where: { interpreterProfile: { userRole: { id: user.userRoleId } } },
      });
    }

    return result;
  }

  public async createOrUpdateInterpreterProfile(
    userRole: UserRole,
    interpreterProfile: IInterpreterProfile,
  ): Promise<void> {
    const existingInterpreterProfile = await this.interpreterProfileRepository.findOne({
      where: { userRole: { id: userRole.id } },
    });

    if (!existingInterpreterProfile) {
      const newInterpreterProfile = this.interpreterProfileRepository.create({
        userRole: userRole,
        ...interpreterProfile,
      });
      await this.interpreterProfileRepository.save(newInterpreterProfile);
    }

    if (existingInterpreterProfile) {
      interpreterProfile.knownLanguages.push(...existingInterpreterProfile.knownLanguages);
      interpreterProfile.knownLanguages = Array.from(new Set(interpreterProfile.knownLanguages));
      interpreterProfile.type.push(...existingInterpreterProfile.type);
      interpreterProfile.type = Array.from(new Set(interpreterProfile.type));

      await this.interpreterProfileRepository.update(existingInterpreterProfile.id, {
        ...interpreterProfile,
      });
    }
  }

  public async deleteLanguageFromInterpreterProfile(languagePairs: LanguagePair[], userRoleId: string): Promise<void> {
    const interpreterProfile = await findOneOrFail(userRoleId, this.interpreterProfileRepository, {
      where: { userRole: { id: userRoleId } },
      relations: {
        languagePairs: true,
      },
    });

    const knownLanguages: ELanguages[] = [];

    for (const languagePair of interpreterProfile.languagePairs) {
      knownLanguages.push(languagePair.languageFrom);
      knownLanguages.push(languagePair.languageTo);
    }

    const removingLanguages: ELanguages[] = [];

    for (const pair of languagePairs) {
      removingLanguages.push(pair.languageFrom);
      removingLanguages.push(pair.languageTo);
    }

    for (const language of removingLanguages) {
      knownLanguages.splice(knownLanguages.indexOf(language), 1);
    }

    const newKnownLanguages: ELanguages[] = Array.from(new Set(knownLanguages));

    await this.interpreterProfileRepository.update(
      { id: interpreterProfile.id },
      { knownLanguages: newKnownLanguages },
    );
    await this.languagePairRepository.remove(languagePairs);
  }

  public async createLanguagePairs(
    user: ITokenUserData,
    dto: CreateLanguagePairDto,
    rightToWorkCheck?: RightToWorkCheck,
  ): Promise<void> {
    if (ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role) && !dto.userRoleId) {
      throw new BadRequestException("userRoleId should not be empty.");
    }

    const interpreterProfile = await findOneOrFail(
      dto.userRoleId ?? user.userRoleId,
      this.interpreterProfileRepository,
      {
        where: { userRole: { id: dto.userRoleId ?? user.userRoleId } },
        relations: { userRole: true },
      },
    );

    await this.usersRolesService.validateCompanyAdminForUserRole(user, interpreterProfile.userRole);

    for (const pair of dto.languagePairs) {
      const languageLevel = await this.mapInterpreterLevelToLanguageLevel(pair.interpreterLevel!);

      const languagePair = this.languagePairRepository.create({
        interpreterProfile: interpreterProfile,
        languageFrom: pair.from,
        languageTo: pair.to,
        languageLevel: languageLevel,
        rightToWorkCheck,
      });

      await this.languagePairRepository.save(languagePair);
    }
  }

  public async setCustomInsurance(user: ITokenUserData, dto: CustomInsuranceDto): Promise<void> {
    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      address: true,
      customInsurance: true,
    });

    if (!AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userRole?.address?.country as EExtCountry)) {
      throw new ForbiddenException("This request is available only for Australia and New Zealand citizens");
    }

    if (userRole.customInsurance) {
      await this.customInsuranceRepository.update(
        { id: userRole.customInsurance.id },
        {
          insuredParty: dto.insuredParty,
          insuranceCompany: dto.insuranceCompany,
          policyNumber: dto.policyNumber,
          coverageLimit: dto.coverageLimit,
        },
      );
    }

    if (!userRole.customInsurance) {
      const customInsurance = this.customInsuranceRepository.create({ ...dto, userRole });
      await this.customInsuranceRepository.save(customInsurance);
    }

    await this.activationTrackingService.checkStepsEnded(user);
  }

  public async getCustomInsurance(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<CustomInsurance | null> {
    let result: CustomInsurance | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      if (!dto?.id) {
        throw new BadRequestException("Set Custom Insurance id!");
      }

      result = await this.customInsuranceRepository.findOne({
        where: { id: dto.id },
      });
    } else {
      result = await this.customInsuranceRepository.findOne({
        where: {
          userRole: { id: user.userRoleId, role: { name: user.role } },
        },
      });
    }

    return result;
  }

  public async removeCustomInsurance(id: string): Promise<void> {
    const customInsurance = await this.customInsuranceRepository.findOne({
      where: { id },
    });

    if (!customInsurance) {
      throw new NotFoundException("Custom Insurance not found!");
    }

    await this.customInsuranceRepository.delete({ id });

    return;
  }

  public async mapInterpreterLevelToLanguageLevel(interpreterLevel: EExtInterpreterLevel): Promise<ELanguageLevel> {
    if (
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_SPECIALIST_HEALTH_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_SPECIALIST_LEGAL_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_CONFERENCE_INTERPRETER
    ) {
      return ELanguageLevel.FOUR;
    }

    if (interpreterLevel === EExtInterpreterLevel.CERTIFIED_INTERPRETER) {
      return ELanguageLevel.THREE;
    }

    if (
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_PROVISIONAL_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_PROVISIONAL_DEAF_INTERPRETER
    ) {
      return ELanguageLevel.TWO;
    }

    if (
      interpreterLevel === EExtInterpreterLevel.RECOGNISED_PRACTISING_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.RECOGNISED_PRACTISING_DEAF_INTERPRETER
    ) {
      return ELanguageLevel.ONE;
    }

    return ELanguageLevel.ZERO;
  }

  public async updateInterpreterProfile(
    user: ITokenUserData,
    dto: UpdateInterpreterProfileDto,
  ): Promise<MessageOutput> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForQuestionnaire(
      dto,
      user,
      ROLES_CAN_EDIT_NOT_OWN_PROFILES,
    );

    const interpreterProfile = userRole.interpreterProfile;

    if (!interpreterProfile) {
      throw new NotFoundException("Interpreter profile not found.");
    }

    this.helperService.validateWWCCRequirements(dto, user, userRole);

    const updateData: Partial<InterpreterProfile> = {
      audioOnDemandSetting: dto.audioOnDemandSetting,
      videoOnDemandSetting: dto.videoOnDemandSetting,
      faceToFaceOnDemandSetting: dto.faceToFaceOnDemandSetting,
      audioPreBookedSetting: dto.audioPreBookedSetting,
      videoPreBookedSetting: dto.videoPreBookedSetting,
      faceToFacePreBookedSetting: dto.faceToFacePreBookedSetting,
    };

    if (user.role === EUserRoleName.IND_PROFESSIONAL_INTERPRETER) {
      updateData.consecutiveGeneralSetting = dto.consecutiveGeneralSetting;
      updateData.consecutiveLegalSetting = dto.consecutiveLegalSetting;
      updateData.consecutiveMedicalSetting = dto.consecutiveMedicalSetting;
      updateData.conferenceSimultaneousSetting = dto.conferenceSimultaneousSetting;
      updateData.signLanguageSetting = dto.signLanguageSetting;
    }

    await this.interpreterProfileRepository.update(interpreterProfile.id, updateData);

    return { message: "Interpreter profile updated successfully." };
  }

  public async updateInterpreterLocation(dto: OrderEventDto): Promise<MessageOutput> {
    if (!dto.id) {
      throw new BadRequestException("Failed to update interpreter location.");
    }

    if (!isUUID(dto.id)) {
      throw new BadRequestException("Invalid interpreter id.");
    }

    const result = await this.interpreterProfileRepository.update(
      { userRole: { id: dto.id } },
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    );

    if (!result.affected || result.affected === 0) {
      throw new BadRequestException("Failed to update interpreter location.");
    } else {
      return { message: "Success" };
    }
  }

  public async updateAverageInterpreterRating(userRole: UserRole, averageRating: number): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: userRole.id } },
      {
        averageRating,
      },
    );

    if (userRole.interpreterProfile?.interpreterBadgePdf) {
      this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
      });
    }
  }

  public async updateInterpreterOnlineStatus(user: ITokenUserData, dto: SetInterpreterOnlineDto): Promise<void> {
    const DEFAULT_ONLINE_DURATION_MONTHS = 6;
    const currentDate = new Date();
    const endOfWorkDay =
      dto.endOfWorkDay === null ? addMonths(currentDate, DEFAULT_ONLINE_DURATION_MONTHS) : dto.endOfWorkDay;

    await this.interpreterProfileRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        isOnlineForAudio: dto.isOnlineForAudio,
        isOnlineForVideo: dto.isOnlineForVideo,
        isOnlineForFaceToFace: dto.isOnlineForFaceToFace,
        onlineSince: currentDate,
        offlineSince: null,
        endOfWorkDay,
      },
    );
  }

  public async setInterpreterOffline(user: ITokenUserData): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        isOnlineForAudio: false,
        isOnlineForVideo: false,
        isOnlineForFaceToFace: false,
        endOfWorkDay: null,
        onlineSince: null,
        offlineSince: new Date(),
      },
    );
  }
}
