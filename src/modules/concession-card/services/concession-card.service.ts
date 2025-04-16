import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { UsersRolesService } from "src/modules/users-roles/services";
import { EDocumentType } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import {
  ConcessionCardManualDecisionDto,
  GetConcessionCardDto,
  SetConcessionCardDto,
  UpdateConcessionCardDto,
} from "src/modules/concession-card/common/dto";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";
import { EmailsService } from "src/modules/emails/services";
import { IFile } from "src/modules/file-management/common/interfaces";
import { NotificationService } from "src/modules/notifications/services";
import { GetConcessionCardOutput, SetConcessionCardOutput } from "src/modules/concession-card/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class ConcessionCardService {
  private readonly lokiLogger = new LokiLogger(ConcessionCardService.name);

  constructor(
    @InjectRepository(UserConcessionCard)
    private readonly userConcessionCardRepository: Repository<UserConcessionCard>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly usersRolesService: UsersRolesService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly notificationService: NotificationService,
  ) {}

  public async createConcessionCard(dto: SetConcessionCardDto, user: ITokenUserData): Promise<SetConcessionCardOutput> {
    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    if (
      (!dto.centerlinkPensionerConcessionCardNumber && !dto.veteranAffairsPensionerConcessionCardNumber) ||
      (dto.centerlinkPensionerConcessionCardNumber && dto.veteranAffairsPensionerConcessionCardNumber)
    ) {
      throw new BadRequestException("Set one of concession card type!");
    }

    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      languageDocChecks: true,
      ieltsCheck: true,
      userConcessionCard: true,
    });

    if (
      userRole.userConcessionCard &&
      userRole.userConcessionCard.status !== EUserConcessionCardStatus.DOCUMENT_VERIFICATION_FAILS
    ) {
      throw new BadRequestException("Concession card already created for this user!");
    }

    const existConcessionCard = await this.userConcessionCardRepository.findOne({
      where: [
        { centerlinkPensionerConcessionCardNumber: dto.centerlinkPensionerConcessionCardNumber },
        { veteranAffairsPensionerConcessionCardNumber: dto.veteranAffairsPensionerConcessionCardNumber },
      ],
      relations: { userRole: true },
    });

    if (existConcessionCard && existConcessionCard.userRole.userId !== userRole.userId) {
      throw new BadRequestException("Concession card already exist!");
    }

    let concessionCard: UserConcessionCard;

    if (userRole.userConcessionCard) {
      concessionCard = userRole.userConcessionCard;
      Object.assign(concessionCard, dto);
      concessionCard.status = EUserConcessionCardStatus.INITIALIZED;
    }

    if (!userRole.userConcessionCard) {
      concessionCard = this.userConcessionCardRepository.create({ ...dto, userRole });
    }

    const newConcessionCard = await this.userConcessionCardRepository.save(concessionCard!);

    return { id: newConcessionCard.id };
  }

  public async uploadFileToConcessionCard(
    id: string,
    user: ITokenUserData,
    file: IFile,
  ): Promise<SetConcessionCardOutput> {
    if (!file) {
      throw new BadRequestException("File not received!");
    }

    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id },
      relations: {
        document: true,
        userRole: {
          ieltsCheck: true,
        },
      },
    });

    if (!concessionCard) {
      throw new BadRequestException("Concession card not exist for this user!");
    }

    if (concessionCard.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, concessionCard.userRole);

    if (concessionCard.status === EUserConcessionCardStatus.VERIFIED) {
      throw new BadRequestException("File cannot be uploaded for this request!");
    }

    let document: UserDocument;

    if (concessionCard.document) {
      await this.awsS3Service.deleteObject(concessionCard.document.s3Key);

      document = concessionCard.document;
      document.s3Key = file.key;
    }

    if (!concessionCard.document) {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.CONCESSION_CARD,
        s3Key: file.key,
        userRole: concessionCard.userRole,
        userConcessionCard: concessionCard,
      });
    }

    await this.userDocumentRepository.save(document!);

    await this.userConcessionCardRepository.update(
      { id: concessionCard.id },
      { status: EUserConcessionCardStatus.PENDING },
    );

    void this.sendEmailsToAdminsInBackground(concessionCard.userRole.userId);

    return { id: concessionCard.id };
  }

  public async updateConcessionCard(dto: UpdateConcessionCardDto, file?: IFile): Promise<MessageOutput> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id: dto.id },
      relations: { userRole: true, document: true },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found.");
    }

    if (
      (!dto.centerlinkPensionerConcessionCardNumber && !dto.veteranAffairsPensionerConcessionCardNumber) ||
      (dto.centerlinkPensionerConcessionCardNumber && dto.veteranAffairsPensionerConcessionCardNumber)
    ) {
      throw new BadRequestException("Set one of concession card type!");
    }

    if (
      concessionCard.status === EUserConcessionCardStatus.PENDING ||
      concessionCard.status === EUserConcessionCardStatus.INITIALIZED
    ) {
      throw new BadRequestException("Concession card with this id is pending!");
    }

    if (file) {
      if (concessionCard.document) {
        await this.awsS3Service.deleteObject(concessionCard.document.s3Key);

        await this.userDocumentRepository.update({ id: concessionCard.document.id }, { s3Key: file.key });
      }
    }

    await this.userConcessionCardRepository.update(concessionCard.id, {
      centerlinkPensionerConcessionCardNumber: dto.centerlinkPensionerConcessionCardNumber,
      veteranAffairsPensionerConcessionCardNumber: dto.veteranAffairsPensionerConcessionCardNumber,
      status: EUserConcessionCardStatus.PENDING,
    });

    void this.sendEmailsToAdminsInBackground(concessionCard.userRole.userId);

    return { message: "Concession card updated successfully." };
  }

  public async getConcessionCard(
    dto: GetConcessionCardDto,
    user: ITokenUserData,
  ): Promise<GetConcessionCardOutput | null> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    let result: GetConcessionCardOutput | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      if (!dto.id) {
        throw new BadRequestException("Set Concession card check id!");
      }

      result = await this.userConcessionCardRepository.findOne({
        where: { id: dto.id },
        relations: { document: true, userRole: true },
      });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      result = await this.userConcessionCardRepository.findOne({
        where: { userRole: { userId: userId, role: { name: userRoleName } } },
        relations: { document: true, userRole: true },
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

  public async concessionCardManualDecision(dto: ConcessionCardManualDecisionDto, user: ITokenUserData): Promise<void> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, concessionCard.userRole);

    if (concessionCard.status === EUserConcessionCardStatus.INITIALIZED) {
      throw new BadRequestException("Concession card does not have uploaded file!");
    }

    await this.userConcessionCardRepository.update({ id: dto.id }, { status: dto.status });

    if (dto.status === EUserConcessionCardStatus.VERIFIED) {
      await this.activationTrackingService.checkStepsEnded({
        role: concessionCard.userRole.role.name,
        userRoleId: concessionCard.userRole.id,
        email: concessionCard.userRole.user.email,
        id: concessionCard.userRole.userId,
        isActive: concessionCard.userRole.isActive,
      });

      this.notificationService
        .sendConcessionCardCheckVerificationNotification(concessionCard.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send right to work check verification notification for userRoleId: ${concessionCard.userRole.id}`,
            error.stack,
          );
        });
    } else {
      this.notificationService
        .sendConcessionCardCheckErrorNotification(concessionCard.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send right to work check verification notification for userRoleId: ${concessionCard.userRole.id}`,
            error.stack,
          );
        });
    }

    return;
  }

  public async removeConcessionCard(id: string): Promise<void> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found!");
    }

    if (
      concessionCard.status === EUserConcessionCardStatus.PENDING ||
      concessionCard.status === EUserConcessionCardStatus.INITIALIZED
    ) {
      throw new BadRequestException("Concession card with this id is pending!");
    }

    await this.userConcessionCardRepository.delete({ id });

    if (concessionCard.document) {
      await this.awsS3Service.deleteObject(concessionCard.document.s3Key);
    }

    return;
  }

  public async removeConcessionCardFile(id: string, user: ITokenUserData): Promise<void> {
    const concessionCard = await this.userConcessionCardRepository.findOne({
      where: { id },
      relations: { document: true, userRole: { role: true, user: true } },
    });

    if (!concessionCard) {
      throw new NotFoundException("Concession card not found.");
    }

    if (concessionCard.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, concessionCard.userRole);

    if (!concessionCard.document) {
      throw new BadRequestException("Concession card does not have uploaded file.");
    }

    await this.awsS3Service.deleteObject(concessionCard.document.s3Key);
    await this.userDocumentRepository.remove(concessionCard.document);

    return;
  }

  private async sendEmailsToAdminsInBackground(userId: string): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendConcessionCardNotifyToAdmin(superAdmin.email, userId);
    }
  }
}
