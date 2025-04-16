import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { EDocumentType } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import {
  CreateRightToWorkCheckDto,
  EditRightToWorkCheckDto,
  GetAllRightToWorkChecksDto,
  RightToWorkCheckManualDecisionDto,
} from "src/modules/right-to-work-check/common/dto";
import { ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreter-profile/common/enum";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { UserRole } from "src/modules/users-roles/entities";
import { IInterpreterProfile } from "src/modules/interpreter-profile/common/interface";
import { IFile } from "src/modules/file-management/common/interfaces";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { NotificationService } from "src/modules/notifications/services";
import { UsersRolesService } from "src/modules/users-roles/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ESortOrder } from "src/common/enums";
import {
  CreateRightToWorkCheckOutput,
  EditRightToWorkCheckOutput,
  GetRightToWorkCheckOutput,
} from "src/modules/right-to-work-check/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class RightToWorkCheckService {
  private readonly lokiLogger = new LokiLogger(RightToWorkCheckService.name);

  constructor(
    @InjectRepository(RightToWorkCheck)
    private readonly rightToWorkCheckRepository: Repository<RightToWorkCheck>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly notificationService: NotificationService,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async createRightToWorkCheck(
    dto: CreateRightToWorkCheckDto,
    user: ITokenUserData,
  ): Promise<CreateRightToWorkCheckOutput> {
    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      rightToWorkChecks: true,
    });

    const rightToWorkCheck = this.rightToWorkCheckRepository.create({
      languageFrom: dto.languageFrom,
      languageTo: dto.languageTo,
      documentName: dto.documentName,
      userRole,
    });

    const newRightToWorkCheck = await this.rightToWorkCheckRepository.save(rightToWorkCheck);

    return { id: newRightToWorkCheck.id };
  }

  public async uploadFileToRightToWorkCheck(
    id: string,
    user: ITokenUserData,
    file: IFile,
  ): Promise<CreateRightToWorkCheckOutput> {
    if (!file) {
      throw new BadRequestException("File not received!");
    }

    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const rightToWorkCheck = await this.rightToWorkCheckRepository.findOne({
      where: { id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    if (!rightToWorkCheck) {
      throw new BadRequestException("Right to work check not exist!");
    }

    if (rightToWorkCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, rightToWorkCheck.userRole);

    if (rightToWorkCheck.status === ERightToWorkCheckStatus.VERIFIED) {
      throw new BadRequestException("File cannot be uploaded for this request!");
    }

    let document: UserDocument;

    if (rightToWorkCheck?.document) {
      await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);

      document = rightToWorkCheck.document;
      document.s3Key = file.key;
    }

    if (!rightToWorkCheck?.document) {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.LANGUAGE_DOCS,
        s3Key: file.key,
        userRole: rightToWorkCheck.userRole,
        rightToWorkCheck,
      });
    }

    await this.userDocumentRepository.save(document!);

    if (rightToWorkCheck.userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        { status: ERightToWorkCheckStatus.VERIFIED },
      );

      await this.saveVerifiedData(rightToWorkCheck);
    }

    if (rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        { status: ERightToWorkCheckStatus.PENDING },
      );

      void this.sendEmailsToAdminsInBackground(userId);
    }

    return { id: rightToWorkCheck.id };
  }

  public async editRightToWorkCheck(
    dto: EditRightToWorkCheckDto,
    user: ITokenUserData,
    file?: IFile,
  ): Promise<EditRightToWorkCheckOutput> {
    const rightToWorkCheck = await this.rightToWorkCheckRepository.findOne({
      where: { id: dto.id },
      relations: {
        userRole: { role: true },
        document: true,
      },
    });

    if (!rightToWorkCheck) {
      throw new BadRequestException("Right to work check not exist!");
    }

    if (rightToWorkCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, rightToWorkCheck.userRole);

    if (
      rightToWorkCheck.status !== ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
      rightToWorkCheck.status !== ERightToWorkCheckStatus.VERIFIED &&
      rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      throw new BadRequestException("This request can't be edited!");
    }

    if (file) {
      if (rightToWorkCheck.document) {
        await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);

        await this.userDocumentRepository.update({ id: rightToWorkCheck.document.id }, { s3Key: file.key });
      }
    }

    if (rightToWorkCheck.userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        { ...dto, status: ERightToWorkCheckStatus.VERIFIED },
      );
    }

    if (rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        {
          documentName: dto.documentName,
          languageTo: dto.languageTo,
          languageFrom: dto.languageFrom,
          status: ERightToWorkCheckStatus.PENDING,
        },
      );

      void this.sendEmailsToAdminsInBackground(rightToWorkCheck.userRole.userId);
    }

    return { id: rightToWorkCheck.id };
  }

  public async getAllRightToWorkChecks(
    dto: GetAllRightToWorkChecksDto,
    user: ITokenUserData,
  ): Promise<RightToWorkCheck[]> {
    let rightToWorkChecksUserRoleId: string | undefined = user.userRoleId;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      if (!dto.userRoleId) {
        throw new BadRequestException("userRoleId should be not empty!");
      }

      rightToWorkChecksUserRoleId = dto.userRoleId;
    }

    if (!rightToWorkChecksUserRoleId) {
      throw new BadRequestException("User role not found!");
    }

    const rightToWorkChecks = await this.rightToWorkCheckRepository.find({
      where: { userRole: { id: rightToWorkChecksUserRoleId } },
      relations: {
        document: true,
      },
      order: {
        creationDate: ESortOrder.ASC,
      },
    });

    return rightToWorkChecks;
  }

  public async getRightToWorkCheck(
    user: ITokenUserData,
    dto?: OptionalUUIDParamDto,
  ): Promise<GetRightToWorkCheckOutput | null> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found!");
    }

    let result: GetRightToWorkCheckOutput | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      if (!dto?.id) {
        throw new BadRequestException("Set Right to work check id!");
      }

      result = await this.rightToWorkCheckRepository.findOne({
        where: { id: dto.id },
        relations: {
          userRole: true,
          document: true,
        },
      });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      result = await this.rightToWorkCheckRepository.findOne({
        where: {
          userRole: { userId, role: { name: userRoleName } },
        },
        relations: {
          userRole: true,
          document: true,
        },
      });
    }

    if (result) {
      await this.usersRolesService.validateCompanyAdminForUserRole(user, result.userRole);

      if (result?.document?.s3Key) {
        result.downloadLink = await this.awsS3Service.getShortLivedSignedUrl(result.document.s3Key);
      }
    }

    return result;
  }

  public async rightToWorkCheckManualDecision(
    dto: RightToWorkCheckManualDecisionDto,
    user: ITokenUserData,
  ): Promise<void> {
    const rightToWorkCheck = await this.rightToWorkCheckRepository.findOne({
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    if (!rightToWorkCheck) {
      throw new NotFoundException("Right to work check not found!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, rightToWorkCheck.userRole);

    if (rightToWorkCheck.status === ERightToWorkCheckStatus.INITIALIZED) {
      throw new BadRequestException("Right to work check does not have uploaded file!");
    }

    await this.rightToWorkCheckRepository.update({ id: dto.id }, { status: dto.status });

    if (dto.status === ERightToWorkCheckStatus.VERIFIED) {
      this.notificationService
        .sendRightToWorkCheckVerificationNotification(rightToWorkCheck.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send right to work check verification notification for userRoleId: ${rightToWorkCheck.userRole.id}`,
            error.stack,
          );
        });

      await this.saveVerifiedData(rightToWorkCheck);
    } else {
      this.notificationService
        .sendRightToWorkCheckErrorNotification(rightToWorkCheck.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send right to work check error notification for userRoleId: ${rightToWorkCheck.userRole.id}`,
            error.stack,
          );
        });
    }

    return;
  }

  public async removeRightToWorkCheck(id: string, user: ITokenUserData): Promise<void> {
    const rightToWorkCheck = await this.rightToWorkCheckRepository.findOne({
      where: { id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
        languagePairs: true,
        document: true,
      },
    });

    if (!rightToWorkCheck) {
      throw new NotFoundException("Right to work check request not found!");
    }

    if (rightToWorkCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, rightToWorkCheck.userRole);

    if (
      rightToWorkCheck.status !== ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
      rightToWorkCheck.status !== ERightToWorkCheckStatus.VERIFIED &&
      rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      throw new BadRequestException("This request can't be edited!");
    }

    await this.interpreterProfileService.deleteLanguageFromInterpreterProfile(
      rightToWorkCheck.languagePairs,
      rightToWorkCheck.userRole.id,
    );

    await this.rightToWorkCheckRepository.delete({ id });

    if (rightToWorkCheck.document) {
      await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);
    }

    const currentUser: ICurrentUserData = {
      role: rightToWorkCheck.userRole.role.name,
      userRoleId: rightToWorkCheck.userRole.id,
      email: rightToWorkCheck.userRole.user.email,
      id: rightToWorkCheck.userRole.userId,
      isActive: rightToWorkCheck.userRole.isActive,
    };

    await this.activationTrackingService.checkStepsEnded(currentUser);

    return;
  }

  private async createOrUpdateInterpreterProfile(userRole: UserRole, knownLanguages: ELanguages[]): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.OTHER,
      knownLanguages,
      knownLevels: [ELanguageLevel.ZERO],
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole, interpreterProfile);
  }

  private async sendEmailsToAdminsInBackground(userId: string): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendRightToWorkCheckNotifyToAdmin(superAdmin.email, userId);
    }
  }

  private async saveVerifiedData(rightToWorkCheck: RightToWorkCheck): Promise<void> {
    const currentUser: ICurrentUserData = {
      role: rightToWorkCheck.userRole.role.name,
      userRoleId: rightToWorkCheck.userRole.id,
      email: rightToWorkCheck.userRole.user.email,
      id: rightToWorkCheck.userRole.userId,
      isActive: rightToWorkCheck.userRole.isActive,
    };

    await this.createOrUpdateInterpreterProfile(rightToWorkCheck.userRole, [
      rightToWorkCheck.languageFrom,
      rightToWorkCheck.languageTo,
    ]);

    await this.interpreterProfileService.createLanguagePairs(
      currentUser as ITokenUserData,
      {
        languagePairs: [
          { from: rightToWorkCheck.languageFrom, to: rightToWorkCheck.languageTo },
          { from: rightToWorkCheck.languageTo, to: rightToWorkCheck.languageFrom },
        ],
      },
      rightToWorkCheck,
    );
    await this.activationTrackingService.checkStepsEnded(currentUser);

    return;
  }

  public async removeRightToWorkFile(id: string, user: ITokenUserData): Promise<void> {
    const rightToWorkCheck = await this.rightToWorkCheckRepository.findOne({
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (!rightToWorkCheck) {
      throw new NotFoundException("Right to work check not found!");
    }

    if (rightToWorkCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, rightToWorkCheck.userRole);

    if (
      rightToWorkCheck.status !== ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
      rightToWorkCheck.status !== ERightToWorkCheckStatus.VERIFIED &&
      rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      throw new BadRequestException("This request can't be deleted!");
    }

    if (!rightToWorkCheck.document) {
      throw new BadRequestException("Right to work check does not have uploaded file!");
    }

    await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);
    await this.userDocumentRepository.remove(rightToWorkCheck.document);

    return;
  }
}
