import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { InjectRepository } from "@nestjs/typeorm";
import { UserDocument } from "src/modules/users/entities";
import { In, IsNull, Repository } from "typeorm";
import { EDocumentType } from "src/modules/users/common/enums";
import {
  IBackyCheckOrder,
  IDownloadDocsInterface,
  IStartWWCCReq,
  IStartWwccRes,
  IUploadDocsInterface,
} from "src/modules/backy-check/common/interfaces";
import { StartWWCCDto, StatusManualDecisionDto, UpdateWWCCDto } from "src/modules/backy-check/common/dto";
import {
  EExtBackyCheckResultResponse,
  EExtCheckResult,
  EExtCheckStatus,
  EExtIssueState,
  EManualCheckResult,
} from "src/modules/backy-check/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";
import { BackyCheckSdkService } from "src/modules/backy-check/services";
import { EmailsService } from "src/modules/emails/services";
import { UsersRolesService } from "src/modules/users-roles/services";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { UserRole } from "src/modules/users-roles/entities";
import { ConfigService } from "@nestjs/config";
import { MockService } from "src/modules/mock/services";
import { IFile } from "src/modules/file-management/common/interfaces";
import { GetWwccOutput } from "src/modules/backy-check/common/outputs";
import {
  NUMBER_OF_DAYS_IN_WEEK,
  NUMBER_OF_HOURS_IN_DAY,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants/constants";
import { NotificationService } from "src/modules/notifications/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";
import { ROLES_CAN_EDIT_NOT_OWN_PROFILES, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class BackyCheckService {
  private readonly lokiLogger = new LokiLogger(BackyCheckService.name);

  public constructor(
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    @InjectRepository(BackyCheck)
    private readonly backyCheckRepository: Repository<BackyCheck>,
    private readonly awsS3Service: AwsS3Service,
    private readonly backyCheckSdkService: BackyCheckSdkService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly usersRolesService: UsersRolesService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly notificationService: NotificationService,
  ) {}

  public async uploadDocs(id: string, user: ITokenUserData, file: IFile): Promise<IUploadDocsInterface> {
    if (!file) {
      throw new BadRequestException("File not received!");
    }

    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const backyCheck = await this.backyCheckRepository.findOne({
      where: { id },
      relations: {
        document: true,
        userRole: true,
      },
    });

    if (!backyCheck) {
      throw new BadRequestException("WWCC request not exist!");
    }

    if (backyCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, backyCheck.userRole);

    if (backyCheck.manualCheckResults === EManualCheckResult.MANUAL_APPROVED) {
      throw new BadRequestException("File cannot be uploaded for this request!");
    }

    let document: UserDocument;

    if (backyCheck?.document) {
      await this.awsS3Service.deleteObject(backyCheck.document.s3Key);

      document = backyCheck.document;
      document.s3Key = file.key;
    }

    if (!backyCheck?.document) {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.BACKYCHECK,
        s3Key: file.key,
        userRole: backyCheck.userRole,
        backyCheck,
      });
    }

    const newDocument = await this.userDocumentRepository.save(document!);

    await this.backyCheckRepository.update({ id: backyCheck.id }, { manualCheckResults: EManualCheckResult.PENDING });

    void this.sendEmailsToAdminsInBackground(backyCheck.userRole.userId);

    return { id: newDocument.id };
  }

  public async downloadDocs(id: string, user: ITokenUserData): Promise<IDownloadDocsInterface> {
    let document: UserDocument | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      document = await this.userDocumentRepository.findOneBy({ id });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(user.role)) {
      document = await this.userDocumentRepository.findOneBy({
        id,
        userRole: { userId: user.id, role: { name: user.role } },
      });
    }

    if (!document) {
      throw new NotFoundException("Document with this id not found!");
    }

    if (!document.s3Key) {
      throw new UnprocessableEntityException("Document not uploaded or uploaded with error");
    }

    const fileLink = await this.awsS3Service.getShortLivedSignedUrl(document.s3Key);

    return { link: fileLink };
  }

  public async startWWCC(dto: StartWWCCDto, user: ITokenUserData): Promise<IStartWwccRes> {
    const { id: userId } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      profile: true,
      backyCheck: true,
    });

    let backyCheckRequest: BackyCheck;

    if (userRole.backyCheck) {
      backyCheckRequest = userRole.backyCheck;

      if (
        backyCheckRequest.checkStatus === EExtCheckStatus.READY ||
        backyCheckRequest.checkResults === EExtCheckResult.CLEAR ||
        backyCheckRequest.manualCheckResults === EManualCheckResult.MANUAL_APPROVED
      ) {
        throw new BadRequestException("WWCC already successfully ended");
      }

      if (
        backyCheckRequest.checkStatus !== EExtCheckStatus.IN_PROGRESS &&
        backyCheckRequest.checkStatus !== EExtCheckStatus.VERIFIED &&
        backyCheckRequest.manualCheckResults !== EManualCheckResult.MANUAL_REJECTED
      ) {
        throw new BadRequestException("Update WWCC request not possible with current status");
      }

      const creationDate = new Date(backyCheckRequest.creationDate);
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - creationDate.getTime();
      const timeDifferent =
        NUMBER_OF_DAYS_IN_WEEK *
        NUMBER_OF_HOURS_IN_DAY *
        NUMBER_OF_MINUTES_IN_HOUR *
        NUMBER_OF_SECONDS_IN_MINUTE *
        NUMBER_OF_MILLISECONDS_IN_SECOND;

      if (elapsedTime >= timeDifferent) {
        throw new BadRequestException("Order are expired");
      }

      await this.backyCheckRepository.update(
        { id: backyCheckRequest.id },
        {
          WWCCNumber: dto.WWCCNumber,
          checkStatus: null,
          checkResults: null,
          checkResultsNotes: null,
          orderId: null,
          orderOfficerNotes: null,
          manualCheckResults: null,
        },
      );
    } else {
      const newBackyCheckRequest = this.backyCheckRepository.create({
        WWCCNumber: dto.WWCCNumber,
        expiredDate: new Date(dto.expiredDate),
        issueState: dto.issueState,
        userRole: userRole,
      });
      backyCheckRequest = await this.backyCheckRepository.save(newBackyCheckRequest);
    }

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    if (mockEnabled) {
      if (dto.WWCCNumber === this.mockService.mockWWCCNumber) {
        const mock = await this.mockService.mockStartWWCC(backyCheckRequest.id);
        await this.activationTrackingService.checkStepsEnded({
          role: backyCheckRequest.userRole.role.name,
          userRoleId: backyCheckRequest.userRole.id,
          email: backyCheckRequest.userRole.user.email,
          id: backyCheckRequest.userRole.userId,
          isActive: backyCheckRequest.userRole.isActive,
        });

        return mock.result;
      }
    }

    if (dto.issueState === EExtIssueState.AUSTRALIA_CAPITAL_TERRITORY) {
      await this.backyCheckRepository.update(
        { id: backyCheckRequest.id },
        { manualCheckResults: EManualCheckResult.INITIAL },
      );

      return { id: backyCheckRequest.id };
    }

    const requestData: IStartWWCCReq = {
      firstName: userRole.profile.firstName,
      middleName: userRole.profile.middleName || "",
      surname: userRole.profile.lastName,
      email: userRole.profile.contactEmail,
      DOB: userRole.profile.dateOfBirth,
      cardNumber: dto.WWCCNumber,
      cardExpiryDate: dto.expiredDate,
      cardStateIssue: dto.issueState,
      dependantClientID: "",
      costCentreId: "",
    };

    const startWWCCRes = await this.backyCheckSdkService.startWWCC(requestData);

    if (startWWCCRes.result.response === EExtBackyCheckResultResponse.ERROR || !startWWCCRes?.orderDetails) {
      this.notificationService.sendBackyCheckErrorNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send backy check error notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });

      await this.backyCheckRepository.update(
        { id: backyCheckRequest.id },
        {
          checkResultsNotes: startWWCCRes.result.responseDetails,
        },
      );

      throw new ServiceUnavailableException(startWWCCRes.result.responseDetails);
    }

    await this.backyCheckRepository.update(
      { id: backyCheckRequest.id },
      { orderId: startWWCCRes.orderDetails.orderID },
    );

    return { id: backyCheckRequest.id };
  }

  public async updateWWCC(dto: UpdateWWCCDto, user: ITokenUserData, file?: IFile): Promise<MessageOutput> {
    const backyCheck = await this.backyCheckRepository.findOne({
      where: { id: dto.id },
      relations: {
        userRole: { role: true },
        document: true,
      },
    });

    if (!backyCheck) {
      throw new NotFoundException("WWCC check not found!");
    }

    if (backyCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, backyCheck.userRole);

    if (
      backyCheck.checkStatus === EExtCheckStatus.OPEN ||
      backyCheck.checkStatus === EExtCheckStatus.IN_PROGRESS ||
      backyCheck.checkStatus === EExtCheckStatus.VERIFIED ||
      backyCheck.checkStatus === EExtCheckStatus.IN_REVIEW
    ) {
      throw new BadRequestException("Cannot update a pending or in-progress WWCC request.");
    }

    if (file) {
      if (backyCheck.document) {
        await this.awsS3Service.deleteObject(backyCheck.document.s3Key);

        await this.userDocumentRepository.update({ id: backyCheck.document.id }, { s3Key: file.key });
      }
    }

    await this.backyCheckRepository.update(backyCheck.id, {
      WWCCNumber: dto.WWCCNumber,
      expiredDate: dto.expiredDate,
      issueState: dto.issueState,
      checkStatus: dto.checkStatus,
      checkResults: dto.checkResults,
      checkResultsNotes: dto.checkResultsNotes,
      orderOfficerNotes: dto.orderOfficerNotes,
      manualCheckResults: EManualCheckResult.PENDING,
    });

    void this.sendEmailsToAdminsInBackground(backyCheck.userRole.userId);

    return { message: "WWCC request updated succesfully." };
  }

  public async getWWCCRequest(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<GetWwccOutput | null> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    let result: GetWwccOutput | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      if (!dto?.id) {
        throw new BadRequestException("Set WWCC check id!");
      }

      result = await this.backyCheckRepository.findOne({
        where: { id: dto.id },
        relations: { document: true, userRole: true },
      });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      result = await this.backyCheckRepository.findOne({
        where: {
          userRole: { userId, role: { name: userRoleName } },
        },
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

  public async statusManualDecision(dto: StatusManualDecisionDto): Promise<void> {
    const backyCheckRequest = await this.backyCheckRepository.findOne({
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    if (!backyCheckRequest) {
      throw new NotFoundException("Request with this id not exist!");
    }

    if (backyCheckRequest.manualCheckResults === EManualCheckResult.INITIAL) {
      throw new BadRequestException("Request does not have uploaded file!");
    }

    await this.backyCheckRepository.update({ id: dto.id }, { manualCheckResults: dto.status });

    if (dto.status === EManualCheckResult.MANUAL_APPROVED) {
      this.notificationService
        .sendBackyCheckVerificationNotification(backyCheckRequest.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send backy check verification notification for userRoleId: ${backyCheckRequest.userRole.id}`,
            error.stack,
          );
        });

      await this.activationTrackingService.checkStepsEnded({
        role: backyCheckRequest.userRole.role.name,
        userRoleId: backyCheckRequest.userRole.id,
        email: backyCheckRequest.userRole.user.email,
        id: backyCheckRequest.userRole.userId,
        isActive: backyCheckRequest.userRole.isActive,
      });
    }

    if (dto.status === EManualCheckResult.MANUAL_REJECTED) {
      this.notificationService.sendBackyCheckErrorNotification(backyCheckRequest.userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send backy check error notification for userRoleId: ${backyCheckRequest.userRole.id}`,
          error.stack,
        );
      });
    }
  }

  public async removeWWCCRequest(id: string): Promise<void> {
    const backyCheck = await this.backyCheckRepository.findOne({
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (!backyCheck) {
      throw new NotFoundException("WWCC check not found!");
    }

    if (
      backyCheck.checkStatus === EExtCheckStatus.OPEN ||
      backyCheck.checkStatus === EExtCheckStatus.IN_PROGRESS ||
      backyCheck.checkStatus === EExtCheckStatus.VERIFIED ||
      backyCheck.checkStatus === EExtCheckStatus.IN_REVIEW
    ) {
      throw new BadRequestException("Request with this id is pending!");
    }

    await this.backyCheckRepository.delete({ id });

    if (backyCheck.document) {
      await this.awsS3Service.deleteObject(backyCheck.document.s3Key);
    }

    return;
  }

  public async getRequests(orderIds: string[]): Promise<BackyCheck[]> {
    return await this.backyCheckRepository.find({
      where: [
        {
          orderId: In(orderIds),
          checkStatus: In([
            EExtCheckStatus.OPEN,
            EExtCheckStatus.IN_PROGRESS,
            EExtCheckStatus.VERIFIED,
            EExtCheckStatus.IN_REVIEW,
          ]),
          manualCheckResults: IsNull(),
          checkResults: IsNull(),
        },
        {
          orderId: In(orderIds),
          checkStatus: IsNull(),
          manualCheckResults: IsNull(),
          checkResults: IsNull(),
        },
      ],
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });
  }

  public async updateRequests(backyCheckRequests: BackyCheck[]): Promise<BackyCheck[]> {
    return await this.backyCheckRepository.save(backyCheckRequests);
  }

  public async activationTrackingTrigger(userRoles: UserRole[]): Promise<void> {
    const checkUserStepsPromises: Promise<void>[] = [];

    for (const userRole of userRoles) {
      checkUserStepsPromises.push(
        this.activationTrackingService.checkStepsEnded({
          role: userRole.role.name,
          userRoleId: userRole.id,
          email: userRole.user.email,
          id: userRole.userId,
          isActive: userRole.isActive,
        }),
      );
    }

    await Promise.all(checkUserStepsPromises);
  }

  private async sendEmailsToAdminsInBackground(userId: string): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendBeckyCheckNotifyToAdmin(superAdmin.email, userId);
    }
  }

  public async removeWWCCFile(id: string, user: ITokenUserData): Promise<void> {
    const backyCheck = await this.backyCheckRepository.findOne({
      where: { id },
      relations: { userRole: true, document: true },
    });

    if (!backyCheck) {
      throw new NotFoundException("WWCC check not found.");
    }

    if (backyCheck.userRole.id !== user.userRoleId && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    await this.usersRolesService.validateCompanyAdminForUserRole(user, backyCheck.userRole);

    if (!backyCheck.document) {
      throw new BadRequestException("WWCC check does not have uploaded file.");
    }

    await this.awsS3Service.deleteObject(backyCheck.document.s3Key);
    await this.userDocumentRepository.remove(backyCheck.document);

    return;
  }

  async checkBackyCheckStatus(): Promise<void> {
    const backyCheckRequests = await this.backyCheckSdkService.getChecksSummary();

    const requestOrderIds: string[] = [];
    const backyCheckOrders: { [key: string]: IBackyCheckOrder } = {};

    for (const order of backyCheckRequests.orders) {
      requestOrderIds.push(order.orderID);
      backyCheckOrders[order.orderID] = order;
    }

    const requestsFromDb = await this.getRequests(requestOrderIds);
    const requestsForUpdate: BackyCheck[] = [];
    const userRolesOfUpdatingRequests: UserRole[] = [];

    for (const request of requestsFromDb) {
      const orderId = request.orderId;

      if (!orderId) {
        continue;
      }

      let isUpdated = false;

      if (request.checkStatus !== backyCheckOrders[orderId].CheckStatus) {
        request.checkStatus = backyCheckOrders[orderId].CheckStatus;
        isUpdated = true;
      }

      if (
        request.checkResults !== backyCheckOrders[orderId].CheckResults &&
        backyCheckOrders[orderId].CheckResults !== EExtCheckResult.NOT_AVAILABLE
      ) {
        request.checkResults = backyCheckOrders[orderId].CheckResults;
        isUpdated = true;
      }

      if (request.checkResultsNotes !== backyCheckOrders[orderId].CheckResultsNotes) {
        request.checkResultsNotes = backyCheckOrders[orderId].CheckResultsNotes;
        isUpdated = true;
      }

      if (request.orderOfficerNotes !== backyCheckOrders[orderId].OrderOfficerNotes) {
        request.orderOfficerNotes = backyCheckOrders[orderId].OrderOfficerNotes;
        isUpdated = true;
      }

      if (isUpdated) {
        requestsForUpdate.push(request);

        if (backyCheckOrders[orderId].CheckStatus === EExtCheckStatus.READY) {
          this.notificationService.sendBackyCheckVerificationNotification(request.userRole.id).catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to send backy check verification notification for userRoleId: ${request.userRole.id}`,
              error.stack,
            );
          });

          userRolesOfUpdatingRequests.push(request.userRole);
        }
      }

      if (backyCheckOrders[orderId].CheckStatus === EExtCheckStatus.CANCELLED) {
        this.notificationService.sendBackyCheckErrorNotification(request.userRole.id).catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send backy check error notification for userRoleId: ${request.userRole.id}`,
            error.stack,
          );
        });
      }
    }

    await this.updateRequests(requestsForUpdate);
    await this.activationTrackingTrigger(userRolesOfUpdatingRequests);
  }
}
