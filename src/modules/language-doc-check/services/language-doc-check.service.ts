import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UsersRolesService } from "src/modules/users-roles/services";
import { EDocumentType } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import {
  CreateLanguageDocCheckDto,
  LanguageDocCheckManualDecisionDto,
  UpdateLanguageDocCheckDto,
} from "src/modules/language-doc-check/common/dto";
import { CreateLanguageDocCheckOutput, GetLanguageDocCheckOutput } from "src/modules/language-doc-check/common/outputs";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { EmailsService } from "src/modules/emails/services";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreter-profile/common/enum";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { UserRole } from "src/modules/users-roles/entities";
import { IInterpreterProfile } from "src/modules/interpreter-profile/common/interface";
import { EIeltsStatus } from "src/modules/ielts/common/enums";
import { IFile } from "src/modules/file-management/common/interfaces";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { NotificationService } from "src/modules/notifications/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { findOneOrFail } from "src/common/utils";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { LanguagePairDto } from "src/modules/interpreter-profile/common/dto";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class LanguageDocCheckService {
  private readonly lokiLogger = new LokiLogger(LanguageDocCheckService.name);
  constructor(
    @InjectRepository(LanguageDocCheck)
    private readonly languageDocCheckRepository: Repository<LanguageDocCheck>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly usersRolesService: UsersRolesService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly notificationService: NotificationService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
  ) {}

  public async getUsersLanguageDocChecks(
    user: ITokenUserData,
    dto?: OptionalUUIDParamDto,
  ): Promise<GetLanguageDocCheckOutput[]> {
    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      if (!dto?.id) {
        throw new BadRequestException("Set user role id.");
      }
    } else if (dto?.id && dto.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request.");
    }

    const languageDocChecks: GetLanguageDocCheckOutput[] = await this.languageDocCheckRepository.find({
      where: {
        userRole: { id: dto?.id ?? user.userRoleId },
      },
      relations: { document: true, userRole: true },
    });

    for (const languageDocCheck of languageDocChecks) {
      await this.usersRolesService.validateCompanyAdminForUserRole(user, languageDocCheck.userRole);

      if (languageDocCheck?.document?.s3Key) {
        languageDocCheck.downloadLink = await this.awsS3Service.getShortLivedSignedUrl(languageDocCheck.document.s3Key);
      }
    }

    return languageDocChecks;
  }

  public async createLanguageDocCheck(
    dto: CreateLanguageDocCheckDto,
    user: ITokenUserData,
  ): Promise<CreateLanguageDocCheckOutput> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      languageDocChecks: true,
      ieltsCheck: true,
      profile: true,
    });

    const languageToCheck = dto.language ?? ELanguages.ENGLISH;
    await this.validateLanguageDocCheckRequest(dto, userRole, user, languageToCheck);

    const failedDocCheck = userRole.languageDocChecks?.find(
      (doc) =>
        doc.language === languageToCheck && doc.status === ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS,
    );

    if (failedDocCheck) {
      await this.languageDocCheckRepository.update(failedDocCheck.id, {
        ...dto,
        status: ELanguageDocCheckRequestStatus.INITIALIZED,
      });

      return { id: failedDocCheck.id };
    } else {
      const newLanguageDocCheck = this.languageDocCheckRepository.create({ ...dto, userRole });
      const savedDocCheck = await this.languageDocCheckRepository.save(newLanguageDocCheck);

      return { id: savedDocCheck.id };
    }
  }

  public async uploadFileToLanguageDocCheck(id: string, user: ITokenUserData, file: IFile): Promise<void> {
    if (!file) {
      throw new BadRequestException("File not received.");
    }

    const languageDocCheck = await findOneOrFail(id, this.languageDocCheckRepository, {
      where: { id },
      relations: {
        document: true,
        userRole: {
          ieltsCheck: true,
        },
      },
    });

    if (languageDocCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request.");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, languageDocCheck.userRole);

    if (languageDocCheck.status === ELanguageDocCheckRequestStatus.VERIFIED) {
      throw new BadRequestException("File cannot be uploaded for this request.");
    }

    let document: UserDocument;

    if (languageDocCheck?.document) {
      await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);

      document = languageDocCheck.document;
      document.s3Key = file.key;
    } else {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.LANGUAGE_DOCS,
        s3Key: file.key,
        userRole: languageDocCheck.userRole,
        languageDocCheck,
      });
    }

    await this.userDocumentRepository.save(document);
    await this.languageDocCheckRepository.update(
      { id: languageDocCheck.id },
      { status: ELanguageDocCheckRequestStatus.PENDING },
    );

    void this.sendEmailsToAdminsInBackground(languageDocCheck.userRole.userId).catch((error: Error) =>
      this.lokiLogger.error(
        `Failed to send emails to admins in background for language doc check: ${languageDocCheck.id}`,
        error.stack,
      ),
    );
  }

  public async updateLanguageDocCheck(
    dto: UpdateLanguageDocCheckDto,
    user: ITokenUserData,
    file?: IFile,
  ): Promise<void> {
    const languageDocCheck = await findOneOrFail(dto.id, this.languageDocCheckRepository, {
      where: { id: dto.id },
      relations: {
        userRole: { role: true, interpreterProfile: { languagePairs: true } },
        document: true,
      },
    });

    if (languageDocCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request.");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, languageDocCheck.userRole);

    if (
      languageDocCheck.status === ELanguageDocCheckRequestStatus.PENDING ||
      languageDocCheck.status === ELanguageDocCheckRequestStatus.INITIALIZED
    ) {
      throw new BadRequestException("This language doc check is in status pending.");
    }

    if (file) {
      if (languageDocCheck.document) {
        await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);

        await this.userDocumentRepository.update({ id: languageDocCheck.document.id }, { s3Key: file.key });
      }
    }

    await this.languageDocCheckRepository.update(
      { id: languageDocCheck.id },
      {
        pteTestRegistrationId: dto.pteTestRegistrationId,
        pteScoreReportCode: dto.pteScoreReportCode,
        language: dto.language ?? ELanguages.ENGLISH,
        status: ELanguageDocCheckRequestStatus.PENDING,
      },
    );
    await this.handleDeleteLanguageFromInterpreterProfile(languageDocCheck);

    void this.sendEmailsToAdminsInBackground(languageDocCheck.userRole.userId).catch((error: Error) =>
      this.lokiLogger.error(
        `Failed to send emails to admins in background for language doc check: ${languageDocCheck.id}`,
        error.stack,
      ),
    );
  }

  private async handleDeleteLanguageFromInterpreterProfile(languageDocCheck: LanguageDocCheck): Promise<void> {
    const interpreterProfile = languageDocCheck.userRole.interpreterProfile;
    const languageToRemove = languageDocCheck.language;

    if (!interpreterProfile) {
      return;
    }

    const languagePairsToRemove = interpreterProfile.languagePairs.filter(
      (pair) => pair.languageFrom === languageToRemove || pair.languageTo === languageToRemove,
    );

    if (languagePairsToRemove.length > 0) {
      await this.interpreterProfileService.deleteLanguageFromInterpreterProfile(
        languagePairsToRemove,
        languageDocCheck.userRole.id,
      );
    }
  }

  public async languageDocCheckManualDecision(dto: LanguageDocCheckManualDecisionDto): Promise<void> {
    const languageDocCheck = await findOneOrFail(dto.id, this.languageDocCheckRepository, {
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
          profile: true,
        },
      },
    });

    if (languageDocCheck.status === ELanguageDocCheckRequestStatus.INITIALIZED) {
      throw new BadRequestException("Language doc check does not have uploaded file.");
    }

    await this.languageDocCheckRepository.update({ id: dto.id }, { status: dto.status });

    if (dto.status === ELanguageDocCheckRequestStatus.VERIFIED) {
      const currentUser: ICurrentUserData = {
        role: languageDocCheck.userRole.role.name,
        userRoleId: languageDocCheck.userRole.id,
        email: languageDocCheck.userRole.user.email,
        id: languageDocCheck.userRole.userId,
        isActive: languageDocCheck.userRole.isActive,
      };

      await this.generateLanguageDocCheckPairs(languageDocCheck.userRole, currentUser, languageDocCheck.language);
      await this.createOrUpdateInterpreterProfile(languageDocCheck);
      await this.activationTrackingService.checkStepsEnded(currentUser);

      this.notificationService
        .sendLanguageDocCheckVerificationNotification(languageDocCheck.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send language doc check verification notification for userRoleId: ${languageDocCheck.userRole.id}`,
            error.stack,
          );
        });
    } else {
      this.notificationService
        .sendLanguageDocCheckErrorNotification(languageDocCheck.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send language doc check verification notification for userRoleId: ${languageDocCheck.userRole.id}`,
            error.stack,
          );
        });
    }

    return;
  }

  public async removeLanguageDocCheck(id: string): Promise<void> {
    const languageDocCheck = await findOneOrFail(id, this.languageDocCheckRepository, {
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (
      languageDocCheck.status === ELanguageDocCheckRequestStatus.PENDING ||
      languageDocCheck.status === ELanguageDocCheckRequestStatus.INITIALIZED
    ) {
      throw new BadRequestException("This language doc check is in status pending.");
    }

    await this.languageDocCheckRepository.delete({ id });
    await this.interpreterProfileRepository.delete({ userRole: { id: languageDocCheck.userRole.id } });

    if (languageDocCheck.document) {
      await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);
    }

    if (languageDocCheck.userRole.interpreterProfile?.interpreterBadgePdf) {
      await this.interpreterBadgeService.removeInterpreterBadgePdf(languageDocCheck.userRole);
    }

    return;
  }

  public async removeLanguageDocCheckFile(id: string, user: ITokenUserData): Promise<void> {
    const languageDocCheck = await findOneOrFail(id, this.languageDocCheckRepository, {
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (languageDocCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request.");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, languageDocCheck.userRole);

    if (!languageDocCheck.document) {
      throw new BadRequestException("Language doc check does not have uploaded file!");
    }

    await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);
    await this.userDocumentRepository.remove(languageDocCheck.document);

    return;
  }

  private async generateLanguageDocCheckPairs(
    userRole: UserRole,
    currentUser: ICurrentUserData,
    newLanguage: ELanguages,
  ): Promise<void> {
    if (!userRole.profile.nativeLanguage) {
      throw new BadRequestException("User must set up native language.");
    }

    await this.interpreterProfileService.createLanguagePairs(currentUser as ITokenUserData, {
      languagePairs: [
        { from: newLanguage, to: userRole.profile.nativeLanguage },
        { from: userRole.profile.nativeLanguage, to: newLanguage },
      ],
    });

    const interpreterProfile = await findOneOrFail(
      userRole.id,
      this.interpreterProfileRepository,
      {
        where: { userRole: { id: userRole.id } },
      },
      "userRole.id",
    );

    const foreignLanguages = interpreterProfile.knownLanguages.filter(
      (language) => language !== userRole.profile.nativeLanguage && language !== newLanguage,
    );

    const missingPairs: LanguagePairDto[] = [];
    for (const foreignLanguage of foreignLanguages) {
      missingPairs.push({ from: newLanguage, to: foreignLanguage });
      missingPairs.push({ from: foreignLanguage, to: newLanguage });
    }

    if (missingPairs.length > 0) {
      await this.interpreterProfileService.createLanguagePairs(currentUser as ITokenUserData, {
        languagePairs: missingPairs,
      });
    }
  }

  private async createOrUpdateInterpreterProfile(languageDocCheck: LanguageDocCheck): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.OTHER,
      knownLanguages: [languageDocCheck.language, languageDocCheck.userRole.profile.nativeLanguage!],
      knownLevels: [ELanguageLevel.ZERO],
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(
      languageDocCheck.userRole,
      interpreterProfile,
    );
  }

  private async sendEmailsToAdminsInBackground(userId: string): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendLanguageDocNotifyToAdmin(superAdmin.email, userId);
    }
  }

  private async validateLanguageDocCheckRequest(
    dto: CreateLanguageDocCheckDto,
    userRole: UserRole,
    user: ITokenUserData,
    languageToCheck: ELanguages,
  ): Promise<void> {
    if (userRole.profile.nativeLanguage === languageToCheck) {
      throw new BadRequestException("Language doc check language cannot be the same as the user's native language.");
    }

    const existingDocCheck = userRole.languageDocChecks?.find(
      (doc) =>
        doc.language === languageToCheck && doc.status !== ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS,
    );

    if (existingDocCheck) {
      throw new BadRequestException("Language doc check already created for this language.");
    }

    if (userRole.ieltsCheck && userRole.ieltsCheck.status !== EIeltsStatus.FAIL) {
      throw new BadRequestException("This user already have success IELTS check.");
    }

    if (dto.pteTestRegistrationId && dto.pteScoreReportCode) {
      const existingPteCheck = await this.languageDocCheckRepository.findOne({
        where: [{ pteTestRegistrationId: dto.pteTestRegistrationId }, { pteScoreReportCode: dto.pteScoreReportCode }],
        relations: { userRole: true },
      });

      if (existingPteCheck && existingPteCheck.userRole.userId !== user.id) {
        throw new BadRequestException("PTE numbers already exist and are associated with another user.");
      }
    }
  }
}
