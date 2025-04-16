import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, ILike, Repository } from "typeorm";
import { GetAllInterpretersDto, NaatiCpnQueryDto } from "src/modules/naati/common/dto";
import { NaatiInterpreter, NaatiProfile } from "src/modules/naati/entities";
import { EExtInterpreterLevel, EExtNaatiInterpreterType, EExtNaatiLanguages } from "src/modules/naati/common/enum";
import { createHmac, randomUUID } from "crypto";
import {
  INaatiApiData,
  INaatiApiResponse,
  INaatiCertifiedLanguages,
  INaatiCertifiedLanguagesList,
  INaatiInterpreterProfile,
} from "src/modules/naati/common/interface";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "src/modules/users-roles/entities";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreter-profile/common/enum";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { IInterpreterProfile } from "src/modules/interpreter-profile/common/interface";
import { MockService } from "src/modules/mock/services";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { GetAllInterpretersOutput } from "src/modules/naati/common/outputs";
import {
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  ROLES_CAN_EDIT_NOT_OWN_PROFILES,
  ROLES_CAN_GET_NOT_OWN_PROFILES,
} from "src/common/constants";
import { UsersRolesService } from "src/modules/users-roles/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class NaatiService {
  private readonly lokiLogger = new LokiLogger(NaatiService.name);
  constructor(
    @InjectRepository(NaatiInterpreter)
    private readonly naatiInterpreterRepository: Repository<NaatiInterpreter>,
    @InjectRepository(NaatiProfile)
    private readonly naatiProfileRepository: Repository<NaatiProfile>,
    private readonly configService: ConfigService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly mockService: MockService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async findCurrentUserInInternalDatabase(user: ITokenUserData): Promise<INaatiCertifiedLanguagesList> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new NotFoundException("User not found.");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(userId, userRoleName, { profile: true });

    if (userRole?.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    const existingInterpreter = await this.findInterpreterInDatabase(
      userRole.profile.firstName,
      userRole.profile.lastName,
    );

    if (!existingInterpreter) {
      throw new NotFoundException("Interpreter not found.");
    }

    await this.createOrUpdateNaatiProfile(userRole, existingInterpreter);
    await this.createOrUpdateInterpreterProfile(userRole, existingInterpreter);
    await this.activationTrackingService.checkStepsEnded(user);

    const certifiedLanguagesList: INaatiCertifiedLanguagesList = {
      primaryLanguage: ELanguages.ENGLISH,
      certifiedLanguages: existingInterpreter.certifiedLanguages,
    };

    return certifiedLanguagesList;
  }

  private async findInterpreterInDatabase(
    firstName: string,
    lastName: string,
  ): Promise<INaatiInterpreterProfile | null> {
    const existingInterpreter = await this.naatiInterpreterRepository.findOne({
      where: {
        givenName: ILike(firstName),
        surname: ILike(lastName),
      },
      relations: { languagePairs: true },
    });

    if (!existingInterpreter) {
      return null;
    }

    const certifiedLanguagesMap = new Map<string, INaatiCertifiedLanguages>();

    for (const pair of existingInterpreter.languagePairs) {
      if (pair.languageFrom !== ELanguages.ENGLISH) {
        const key = `${pair.languageFrom}-${pair.interpreterLevel}`;

        certifiedLanguagesMap.set(key, {
          language: pair.languageFrom as ELanguages,
          interpreterLevel: pair.interpreterLevel,
        });
      }

      if (pair.languageTo !== ELanguages.ENGLISH) {
        const key = `${pair.languageTo}-${pair.interpreterLevel}`;
        certifiedLanguagesMap.set(key, {
          language: pair.languageTo as ELanguages,
          interpreterLevel: pair.interpreterLevel,
        });
      }
    }

    const practitioner: INaatiInterpreterProfile = {
      practitionerCpn: "unknown-internal",
      givenName: existingInterpreter.givenName,
      familyName: existingInterpreter.surname,
      country: existingInterpreter.address?.country ?? "unknown-internal",
      certifiedLanguages: Array.from(certifiedLanguagesMap.values()),
    };

    return practitioner;
  }

  public async saveCpnNaatiInfo(user: ITokenUserData, dto: NaatiCpnQueryDto): Promise<MessageOutput> {
    if (ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role) && !dto.userRoleId) {
      throw new BadRequestException("userRoleId should not be empty.");
    }

    const naatiProfile = await this.naatiProfileRepository.findOne({
      where: { userRole: { id: dto.userRoleId ?? user.userRoleId } },
      relations: { userRole: { role: true, user: true } },
    });

    if (!naatiProfile) {
      throw new NotFoundException("Naati profile not found.");
    }

    if (naatiProfile.userRole?.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    if (naatiProfile.practitionerCpn === dto.cpn) {
      throw new BadRequestException("Cpn number already saved.");
    }

    await this.naatiProfileRepository.update(naatiProfile.id, {
      practitionerCpn: dto.cpn,
    });

    return { message: "Cpn number saved" };
  }

  public async verificationNaatiCpnNumber(
    user: ITokenUserData,
    dto: NaatiCpnQueryDto,
  ): Promise<INaatiCertifiedLanguagesList> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      profile: true,
      role: true,
      user: true,
    });

    if (userRole?.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    let naatiResponse: INaatiApiResponse;

    if (mockEnabled) {
      if (dto.cpn === this.mockService.mockNaatiNumber) {
        const mock = this.mockService.mockVerificationNaatiCpnNumber(
          userRole.profile.firstName,
          userRole.profile.lastName,
        );
        naatiResponse = mock.result;
      }

      if (dto.cpn !== this.mockService.mockNaatiNumber) {
        naatiResponse = await this.getInfoFromNaati(dto);
      }
    }

    if (!mockEnabled) {
      naatiResponse = await this.getInfoFromNaati(dto);
    }

    const practitioner = await this.validateNaatiInterpreter(userRole, naatiResponse!, dto);
    await this.createOrUpdateNaatiProfile(userRole, practitioner);
    await this.createOrUpdateInterpreterProfile(userRole, practitioner);
    const certifiedLanguagesList: INaatiCertifiedLanguagesList = {
      primaryLanguage: ELanguages.ENGLISH,
      certifiedLanguages: practitioner.certifiedLanguages,
    };

    await this.activationTrackingService.checkStepsEnded({
      id: userRole.userId,
      role: userRole.role.name,
      userRoleId: userRole.id,
      email: userRole.user.email,
      isActive: userRole.isActive,
    });

    return certifiedLanguagesList;
  }

  public async getInfoByCpnNumber(dto: NaatiCpnQueryDto): Promise<INaatiApiResponse> {
    const naatiResponse = await this.getInfoFromNaati(dto);

    return naatiResponse;
  }

  public async getNaatiProfile(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<NaatiProfile | null> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    let result: NaatiProfile | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      if (!dto?.id) {
        throw new BadRequestException("Set NAATI check id!");
      }

      result = await this.naatiProfileRepository.findOne({ where: { id: dto.id }, relations: { userRole: true } });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      result = await this.naatiProfileRepository.findOne({
        where: {
          userRole: { userId, role: { name: userRoleName } },
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

  private async getInfoFromNaati(dto: NaatiCpnQueryDto): Promise<INaatiApiResponse> {
    const { baseUrl, publicKey, privateKey } = this.configService.getOrThrow<INaatiApiData>("naati");
    const query = `PractitionerId=${encodeURIComponent(dto.cpn)}`;
    const method = "GET";
    const url = `${baseUrl}?${query}`;

    // TODO: Remove after moving to the Prod, Use only for Dev
    const originalTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.createAuthorizationHeader(publicKey, privateKey, method, url),
      },
    });

    const naatiResponse = await response.text();

    if (!response.ok) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsSetting;
      throw new ServiceUnavailableException(`Error from NAATI: ${response.statusText}`);
    }

    const naatiParsedResponse: INaatiApiResponse = JSON.parse(naatiResponse) as INaatiApiResponse;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsSetting;

    return naatiParsedResponse;
  }

  private createAuthorizationHeader(publicKey: string, privateKey: string, method: string, url: string): string {
    const encodedUrl = encodeURIComponent(url).toLowerCase();
    const requestTimestamp = Math.floor(Date.now() / NUMBER_OF_MILLISECONDS_IN_SECOND);
    const nonce = randomUUID();
    const requestContentBase64String = "";
    const signingString = publicKey + method + encodedUrl + requestTimestamp + nonce + requestContentBase64String;
    const secretKey = Buffer.from(privateKey, "base64");
    const hmac = createHmac("sha256", secretKey);
    hmac.update(signingString);
    const rawSignature = hmac.digest("base64");
    const authorizationHeader = `NAATI ${publicKey}:${rawSignature}:${nonce}:${requestTimestamp}`;

    return authorizationHeader;
  }

  private async validateNaatiInterpreter(
    userRole: UserRole,
    naatiApiResponse: INaatiApiResponse,
    dto: NaatiCpnQueryDto,
  ): Promise<INaatiInterpreterProfile> {
    try {
      const { practitioner, currentCertifications, previousCertifications } = naatiApiResponse;

      if (naatiApiResponse.errorDescription) {
        throw new NotFoundException("The Cpn number is not valid.");
      }

      if (practitioner) {
        const fullNameFromNaati1 = (practitioner.givenName + ", " + practitioner.familyName).toUpperCase();
        const fullNameFromNaati2 = (practitioner.familyName + ", " + practitioner.givenName).toUpperCase();
        const userFullName1 = (userRole.profile.firstName + ", " + userRole.profile.lastName).toUpperCase();
        const userFullName2 = (userRole.profile.lastName + ", " + userRole.profile.firstName).toUpperCase();

        if (
          fullNameFromNaati1 !== userFullName1 &&
          fullNameFromNaati1 !== userFullName2 &&
          fullNameFromNaati2 !== userFullName1 &&
          fullNameFromNaati2 !== userFullName2
        ) {
          throw new BadRequestException("The name from Naati does not match the name entered by the user.");
        }
      }

      const relevantCertifications = [...currentCertifications, ...previousCertifications];
      const certifiedLanguages: INaatiCertifiedLanguages[] = [];

      for (const certification of relevantCertifications) {
        if (Object.values(EExtInterpreterLevel).includes(certification.certificationType)) {
          const language =
            certification.language1 === EExtNaatiLanguages.ENGLISH ? certification.language2 : certification.language1;
          const transformLanguage = await this.translateLanguage(language);

          if (transformLanguage !== ELanguages.ENGLISH) {
            certifiedLanguages.push({
              language: transformLanguage,
              interpreterLevel: certification.certificationType,
            });
          }
        }
      }

      return {
        practitionerCpn: practitioner.practitionerId,
        givenName: practitioner.givenName,
        familyName: practitioner.familyName,
        country: practitioner.country,
        certifiedLanguages,
      };
    } catch (error) {
      await this.logNaatiVerificationError(userRole, (error as Error).message, dto);
      throw error;
    }
  }

  public async translateLanguage(extLang: EExtNaatiLanguages): Promise<ELanguages> {
    const key = Object.keys(EExtNaatiLanguages).find(
      (key) => EExtNaatiLanguages[key as keyof typeof EExtNaatiLanguages] === extLang,
    );

    if (key && ELanguages[key as keyof typeof ELanguages]) {
      return ELanguages[key as keyof typeof ELanguages];
    } else {
      throw new BadRequestException(`The language ${extLang} is not supported. Please contact support.`);
    }
  }

  private async createOrUpdateNaatiProfile(userRole: UserRole, practitioner: INaatiInterpreterProfile): Promise<void> {
    const existingNaatiProfile = await this.naatiProfileRepository.findOne({
      where: { userRole: { id: userRole.id } },
    });

    if (!existingNaatiProfile) {
      const newNaatiProfile = this.naatiProfileRepository.create({
        userRole: userRole,
        ...practitioner,
      });
      await this.naatiProfileRepository.save(newNaatiProfile);
    }

    if (existingNaatiProfile) {
      await this.naatiProfileRepository.update(existingNaatiProfile.id, {
        ...practitioner,
        message: null,
      });
    }
  }

  private async createOrUpdateInterpreterProfile(
    userRole: UserRole,
    practitioner: INaatiInterpreterProfile,
  ): Promise<void> {
    const uniqueLanguagesSet = new Set<string>(practitioner.certifiedLanguages.map((lang) => lang.language));
    uniqueLanguagesSet.add(ELanguages.ENGLISH);
    const uniqueLevelsSet = new Set<string>(practitioner.certifiedLanguages.map((lang) => lang.interpreterLevel));
    const knownUniqueLanguages = Array.from(uniqueLanguagesSet);
    const knownUniqueLevelsNaati = Array.from(uniqueLevelsSet);
    const knownUniqueLevels: ELanguageLevel[] = [];

    for (const level of knownUniqueLevelsNaati) {
      const knownLevel = await this.interpreterProfileService.mapInterpreterLevelToLanguageLevel(
        level as EExtInterpreterLevel,
      );
      knownUniqueLevels.push(knownLevel);
    }

    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.NAATI,
      knownLanguages: knownUniqueLanguages as ELanguages[],
      knownLevels: knownUniqueLevels,
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole, interpreterProfile);
  }

  private async logNaatiVerificationError(
    userRole: UserRole,
    errorMessage: string,
    dto: NaatiCpnQueryDto,
  ): Promise<void> {
    const existingNaatiProfile = await this.naatiProfileRepository.findOne({
      where: { userRole: { id: userRole.id } },
    });

    if (existingNaatiProfile) {
      await this.naatiProfileRepository.update(existingNaatiProfile.id, {
        practitionerCpn: dto.cpn,
        givenName: null,
        familyName: null,
        country: null,
        certifiedLanguages: null,
        message: errorMessage,
      });
    }

    if (!existingNaatiProfile) {
      const newNaatiProfile = this.naatiProfileRepository.create({
        userRole: userRole,
        practitionerCpn: dto.cpn,
        givenName: null,
        familyName: null,
        country: null,
        certifiedLanguages: null,
        message: errorMessage,
      });
      await this.naatiProfileRepository.save(newNaatiProfile);
    }
  }

  public async getAllNaatiProfiles(dto: GetAllInterpretersDto): Promise<GetAllInterpretersOutput> {
    const whereConditions: FindOptionsWhere<NaatiInterpreter> = {};

    if (dto.interpreterType) {
      whereConditions.mainSectionInterpreterType = dto.interpreterType;
    }

    if (dto.mainSectionLanguage) {
      whereConditions.mainSectionLanguage = dto.mainSectionLanguage;
    }

    if (dto.interpreterLevel) {
      whereConditions.languagePairs = {
        interpreterLevel: dto.interpreterLevel,
      };
    }

    if (dto.languageFrom && dto.languageTo) {
      whereConditions.languagePairs = {
        languageFrom: dto.languageFrom,
        languageTo: dto.languageTo,
      };
    }

    const [naatiProfiles, count] = await this.naatiInterpreterRepository.findAndCount({
      where: whereConditions,
      take: dto.limit,
      skip: dto.offset,
      order: { creationDate: dto.sortOrder },
      relations: {
        languagePairs: true,
      },
    });

    return { data: naatiProfiles, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async deleteAllProfilesByType(interpreterType: EExtNaatiInterpreterType): Promise<void> {
    const naatiProfiles = await this.naatiInterpreterRepository.find({
      where: {
        mainSectionInterpreterType: interpreterType,
      },
      relations: {
        languagePairs: true,
      },
    });

    this.lokiLogger.log(`Naati Profiles to delete: ${naatiProfiles.length}`);

    await this.naatiInterpreterRepository.remove(naatiProfiles);
  }

  public async deleteAllProfilesByLanguage(language: EExtNaatiLanguages): Promise<void> {
    const translatedLanguage = await this.translateLanguage(language);

    const naatiProfiles = await this.naatiInterpreterRepository.find({
      where: {
        mainSectionLanguage: translatedLanguage,
      },
      relations: {
        languagePairs: true,
      },
    });

    this.lokiLogger.log(`Naati Profiles to delete: ${naatiProfiles.length}`);

    await this.naatiInterpreterRepository.remove(naatiProfiles);
  }

  public async removeNaatiProfile(id: string): Promise<void> {
    const naatiProfile = await this.naatiProfileRepository.findOne({
      where: { id },
      relations: { userRole: true },
    });

    if (!naatiProfile) {
      throw new NotFoundException("Naati profile not found.");
    }

    await this.naatiProfileRepository.remove(naatiProfile);

    return;
  }
}
