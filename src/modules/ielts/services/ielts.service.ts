import { BadRequestException, Injectable } from "@nestjs/common";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { IeltsSdkService } from "src/modules/ielts/services";
import { InjectRepository } from "@nestjs/typeorm";
import { IeltsCheck } from "src/modules/ielts/entities";
import { Repository } from "typeorm";
import { UsersRolesService } from "src/modules/users-roles/services";
import { EIeltsMessage, EIeltsStatus } from "src/modules/ielts/common/enums";
import { IIeltsVerification, IResultVerification } from "src/modules/ielts/common/interfaces";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { UserRole } from "src/modules/users-roles/entities";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreter-profile/common/enum";
import { IInterpreterProfile } from "src/modules/interpreter-profile/common/interface";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { ConfigService } from "@nestjs/config";
import { MockService } from "src/modules/mock/services";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { IeltsVerificationDto } from "src/modules/ielts/common/dto";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { findOneOrFail } from "src/common/utils";

@Injectable()
export class IeltsService {
  public constructor(
    @InjectRepository(IeltsCheck)
    private readonly ieltsCheckRepository: Repository<IeltsCheck>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    private readonly ieltsSdkService: IeltsSdkService,
    private readonly usersRolesService: UsersRolesService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
  ) {}

  public async ieltsVerification(dto: IeltsVerificationDto, user: ITokenUserData): Promise<IIeltsVerification> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      profile: true,
      languageDocChecks: true,
      ieltsCheck: true,
      role: true,
      user: true,
    });

    if (userRole.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    if (
      userRole.languageDocChecks &&
      userRole.languageDocChecks.some(
        (docCheck) => docCheck.status !== ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS,
      )
    ) {
      throw new BadRequestException("This user already have other language doc check.");
    }

    if (!userRole.profile.nativeLanguage) {
      throw new BadRequestException("Please, set up your native language.");
    }

    if (userRole.ieltsCheck && userRole.ieltsCheck.status !== EIeltsStatus.FAIL) {
      throw new BadRequestException("IELTS verification for this user already exists.");
    }

    const existingCertificateIeltsCheck = await this.ieltsCheckRepository.findOne({
      where: { trfNumber: dto.trfNumber },
    });

    if (existingCertificateIeltsCheck && existingCertificateIeltsCheck.status !== EIeltsStatus.FAIL) {
      throw new BadRequestException("IELTS verification for this certificate already exists.");
    }

    let ieltsCheck: IeltsCheck;

    if (userRole.ieltsCheck) {
      ieltsCheck = userRole.ieltsCheck;
      ieltsCheck.status = null;
      ieltsCheck.trfNumber = dto.trfNumber;
    } else {
      ieltsCheck = this.ieltsCheckRepository.create({ trfNumber: dto.trfNumber, userRole });
    }

    const newIeltsCheck = await this.ieltsCheckRepository.save(ieltsCheck);

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    let resultVerification: IResultVerification;

    if (mockEnabled) {
      if (dto.trfNumber === this.mockService.mockIeltsNumber) {
        const mock = this.mockService.mockIeltsVerification(userRole.profile.firstName, userRole.profile.lastName);
        resultVerification = mock.result;
        await this.ieltsCheckRepository.update(
          { id: newIeltsCheck.id },
          { trfNumber: mock.result.results[0].trfNumber },
        );
      } else {
        resultVerification = await this.ieltsSdkService.resultVerification(dto.trfNumber);
      }
    } else {
      resultVerification = await this.ieltsSdkService.resultVerification(dto.trfNumber);
    }

    if (resultVerification.resultSummary.recordCount === 0 || resultVerification.results.length === 0) {
      await this.ieltsCheckRepository.update(
        { id: newIeltsCheck.id },
        { status: EIeltsStatus.FAIL, message: EIeltsMessage.RESULTS_NOT_FOUND },
      );

      throw new BadRequestException("Incorrect number of certificate.");
    }

    if (
      resultVerification.results[0].firstName.toUpperCase() !== userRole.profile.firstName.toUpperCase() ||
      resultVerification.results[0].familyName.toUpperCase() !== userRole.profile.lastName.toUpperCase()
    ) {
      await this.ieltsCheckRepository.update(
        { id: newIeltsCheck.id },
        { status: EIeltsStatus.FAIL, message: EIeltsMessage.NAME_DOES_NOT_MATCH },
      );

      throw new BadRequestException("Firstname or lastname does not match.");
    }

    const minOverallScore = Number(this.configService.getOrThrow<string>("ielts.minOverallScore"));

    if (Number(resultVerification.results[0].overallBandScore) < minOverallScore) {
      await this.ieltsCheckRepository.update(
        { id: newIeltsCheck.id },
        { status: EIeltsStatus.FAIL, message: EIeltsMessage.SCORE_NOT_ENOUGH },
      );

      throw new BadRequestException("Certificate score is not enough.");
    }

    await this.ieltsCheckRepository.update({ id: newIeltsCheck.id }, { status: EIeltsStatus.SUCCESS });

    const currentUser: ICurrentUserData = {
      id: userRole.userId,
      role: userRole.role.name,
      userRoleId: userRole.id,
      email: userRole.user.email,
      isActive: userRole.isActive,
    };

    await this.interpreterProfileService.createLanguagePairs(currentUser as ITokenUserData, {
      languagePairs: [
        { from: ELanguages.ENGLISH, to: userRole.profile.nativeLanguage },
        { from: userRole.profile.nativeLanguage, to: ELanguages.ENGLISH },
      ],
    });
    await this.createOrUpdateInterpreterProfile(userRole);
    await this.activationTrackingService.checkStepsEnded(currentUser);

    return { status: EIeltsStatus.SUCCESS };
  }

  public async getIeltsRequest(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<IeltsCheck | null> {
    let result: IeltsCheck | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      if (!dto?.id) {
        throw new BadRequestException("IELTS check id should not be empty.");
      }

      result = await this.ieltsCheckRepository.findOne({ where: { id: dto.id }, relations: { userRole: true } });
    } else {
      result = await this.ieltsCheckRepository.findOne({
        where: {
          userRole: { userId: user.id, role: { name: user.role } },
        },
        relations: { userRole: true },
      });
    }

    if (result) {
      await this.usersRolesService.validateCompanyAdminForUserRole(user, result.userRole);
    }

    return result;
  }

  public async removeIeltsRequest(id: string): Promise<void> {
    const ieltsRequest = await findOneOrFail(id, this.ieltsCheckRepository, {
      where: { id },
      relations: { userRole: { interpreterProfile: true } },
    });

    const { userRole } = ieltsRequest;

    await this.ieltsCheckRepository.delete({ id });
    await this.interpreterProfileRepository.delete({ userRole: { id: userRole.id } });

    if (userRole.interpreterProfile?.interpreterBadgePdf) {
      await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole);
    }

    return;
  }

  private async createOrUpdateInterpreterProfile(userRole: UserRole): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.IELTS,
      knownLanguages: [ELanguages.ENGLISH, userRole.profile.nativeLanguage!],
      knownLevels: [ELanguageLevel.ZERO],
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole, interpreterProfile);
  }
}
