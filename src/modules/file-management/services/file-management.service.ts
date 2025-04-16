import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NUMBER_BYTES_IN_MEGABYTE } from "src/common/constants";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { ELandingPart } from "src/modules/content-management/common/enums";
import { EContentType, EFileExtension, EFileType, EFolderPath } from "src/modules/file-management/common/enums";
import { IAllowedParams, IFile, IFolderAdditionalParams } from "src/modules/file-management/common/interfaces";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { Readable } from "stream";

@Injectable()
export class FileManagementService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly configService: ConfigService,
  ) {}

  public async uploadTerms(roleName: EUserRoleName, file: IFile): Promise<void> {
    if (!file) {
      throw new BadRequestException("File must not be empty");
    }

    if ([EUserRoleName.SUPER_ADMIN, EUserRoleName.INVITED_GUEST].includes(roleName)) {
      throw new BadRequestException(`Role must not be ${EUserRoleName.SUPER_ADMIN} or ${EUserRoleName.INVITED_GUEST}`);
    }

    const lastSlashIndex = file.key.lastIndexOf("/");
    const folderPath = file.key.substring(0, lastSlashIndex);

    const keyList = await this.awsS3Service.getMediaListObjectKeys(folderPath);
    const objectsToDelete = keyList.filter((key) => key !== file.key).map((key) => ({ Key: key }));

    if (objectsToDelete.length > 0) {
      await this.awsS3Service.deleteMediaObjects(objectsToDelete);
    }
  }

  public async downloadTerms(roleName: EUserRoleName): Promise<string[]> {
    if ([EUserRoleName.SUPER_ADMIN, EUserRoleName.INVITED_GUEST].includes(roleName)) {
      throw new BadRequestException(`Role must not be ${EUserRoleName.SUPER_ADMIN} or ${EUserRoleName.INVITED_GUEST}`);
    }

    const keyList = await this.awsS3Service.getMediaListObjectKeys(`${EFolderPath.UPLOAD_TERMS}/${roleName}/`);

    return keyList.map((key: string) => this.awsS3Service.getMediaObjectUrl(key));
  }

  public async uploadReadableStreamToS3(
    data: ReadableStream | Readable,
    folder: string,
    contentLength: number,
    contentType: EContentType,
    fileType: EFileType,
  ): Promise<string> {
    const { fileSizeLimitMB, possibleContentTypes } = this.getAllowedParams(fileType);

    if (contentLength > fileSizeLimitMB * NUMBER_BYTES_IN_MEGABYTE) {
      throw new BadRequestException(`File largest than limit: ${fileSizeLimitMB} MB!`);
    }

    if (!possibleContentTypes.includes(contentType)) {
      throw new BadRequestException("Incorrect content type!");
    }

    const fileExtension = this.getFileExtension(contentType);

    const key = `${folder}/${new Date().getTime()}.${fileExtension}`;

    await this.awsS3Service.uploadObject(key, data, contentType);

    return key;
  }

  public getAllowedParams(fileType: EFileType): IAllowedParams {
    let fileSizeLimitMB: number = 0;
    let possibleContentTypes: EContentType[] = [];

    if (fileType === EFileType.CONTRACT) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.contractFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_PDF];
    }

    if (fileType === EFileType.BACKY_CHECK) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.backycheckDocsFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_PDF, EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG];
    }

    if (fileType === EFileType.CONCESSION_CARD) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.concessionCardFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_PDF, EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG];
    }

    if (fileType === EFileType.LANGUAGE_DOC_CHECK) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.languageDocsFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_PDF, EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG];
    }

    if (fileType === EFileType.RIGHT_TO_WORK_CHECK) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.rightToWorkCheckDocsFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_PDF, EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG];
    }

    if (fileType === EFileType.UI_LANGUAGES) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.uiJsonFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_JSON];
    }

    if (fileType === EFileType.UPLOAD_TERMS) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.termsFileSizeLimitMB");

      possibleContentTypes = [EContentType.TEXT_PLAIN];
    }

    if (fileType === EFileType.CONTENT_MANAGEMENT) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.contentManagementFileSizeLimitMB");

      possibleContentTypes = [EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG, EContentType.IMAGE_WEBP];
    }

    if (fileType === EFileType.COMPANY_DOCUMENT) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.companyDocumentFileSizeLimitMB");

      possibleContentTypes = [EContentType.APPLICATION_PDF, EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG];
    }

    if (fileType === EFileType.USER_AVATARS) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.userAvatarsFileSizeLimitMB");

      possibleContentTypes = [EContentType.IMAGE_WEBP, EContentType.IMAGE_JPEG, EContentType.IMAGE_PNG];
    }

    if (fileType === EFileType.CHANNELS) {
      fileSizeLimitMB = this.configService.getOrThrow<number>("aws.channelsFileSizeLimitMB");

      possibleContentTypes = [
        EContentType.APPLICATION_PDF,
        EContentType.APPLICATION_DOC,
        EContentType.APPLICATION_DOCX,
        EContentType.APPLICATION_XLS,
        EContentType.APPLICATION_XLSX,
        EContentType.APPLICATION_PPT,
        EContentType.APPLICATION_PPTX,
        EContentType.TEXT_PLAIN,
        EContentType.IMAGE_JPEG,
        EContentType.IMAGE_PNG,
        EContentType.IMAGE_WEBP,
        EContentType.IMAGE_SVG,
      ];
    }

    return { fileSizeLimitMB, possibleContentTypes };
  }

  public getFolderPath(
    fileType: EFileType,
    roleName?: EUserRoleName,
    additionalParams?: IFolderAdditionalParams,
  ): string {
    let folderPath: string | null = null;

    const fileTypeWhichRoleIsRequired = [
      EFileType.CONTRACT,
      EFileType.BACKY_CHECK,
      EFileType.CONCESSION_CARD,
      EFileType.LANGUAGE_DOC_CHECK,
      EFileType.RIGHT_TO_WORK_CHECK,
      EFileType.UI_LANGUAGES,
    ];

    if (fileTypeWhichRoleIsRequired.includes(fileType) && !roleName) {
      throw new ForbiddenException("Role not specified!");
    }

    if (fileType === EFileType.CONTRACT) {
      folderPath = `${EFolderPath.CONTRACT}/${roleName}`;
    }

    if (fileType === EFileType.BACKY_CHECK) {
      folderPath = `${EFolderPath.BACKY_CHECK}/${roleName}`;
    }

    if (fileType === EFileType.CONCESSION_CARD) {
      folderPath = `${EFolderPath.CONCESSION_CARD}/${roleName}`;
    }

    if (fileType === EFileType.LANGUAGE_DOC_CHECK) {
      folderPath = `${EFolderPath.LANGUAGE_DOCS}/${roleName}`;
    }

    if (fileType === EFileType.RIGHT_TO_WORK_CHECK) {
      folderPath = `${EFolderPath.RIGHT_TO_WORK_CHECK}/${roleName}`;
    }

    if (fileType === EFileType.UI_LANGUAGES) {
      folderPath = EFolderPath.UI_LANGUAGES;
    }

    if (fileType === EFileType.UPLOAD_TERMS) {
      if (!additionalParams?.role || !additionalParams?.documentType) {
        throw new BadRequestException("role and documentType must not be empty!");
      }

      folderPath = `${EFolderPath.UPLOAD_TERMS}/${additionalParams.role}/${additionalParams.documentType}`;
    }

    if (fileType === EFileType.CONTENT_MANAGEMENT) {
      if (!additionalParams?.landingPart) {
        folderPath = EFolderPath.CONTENT_MANAGEMENT;
      }

      if (additionalParams?.landingPart === ELandingPart.PROMO) {
        folderPath = `${EFolderPath.CONTENT_MANAGEMENT}/${ELandingPart.PROMO}`;
      }

      if (additionalParams?.landingPart === ELandingPart.REVIEWS) {
        folderPath = `${EFolderPath.CONTENT_MANAGEMENT}/${ELandingPart.REVIEWS}`;
      }
    }

    if (fileType === EFileType.COMPANY_DOCUMENT) {
      folderPath = `${EFolderPath.COMPANY_DOCUMENT}`;
    }

    if (fileType === EFileType.USER_AVATARS) {
      folderPath = EFolderPath.USER_AVATARS;
    }

    if (fileType === EFileType.CHANNELS) {
      folderPath = `${EFolderPath.CHANNELS}/${additionalParams?.channelType}/${additionalParams?.id}`;
    }

    if (!folderPath) {
      throw new BadRequestException("Unknown file type!");
    }

    return folderPath;
  }

  public getFileExtension(contentType: EContentType): EFileExtension {
    let fileExtension: EFileExtension | null = null;

    if (contentType === EContentType.APPLICATION_PDF) {
      fileExtension = EFileExtension.PDF;
    }

    if (contentType === EContentType.IMAGE_WEBP) {
      fileExtension = EFileExtension.WEBP;
    }

    if (contentType === EContentType.IMAGE_PNG) {
      fileExtension = EFileExtension.PNG;
    }

    if (contentType === EContentType.IMAGE_JPEG) {
      fileExtension = EFileExtension.JPEG;
    }

    if (contentType === EContentType.APPLICATION_JSON) {
      fileExtension = EFileExtension.JSON;
    }

    if (contentType === EContentType.TEXT_PLAIN) {
      fileExtension = EFileExtension.TEXT;
    }

    if (contentType === EContentType.APPLICATION_DOC) {
      fileExtension = EFileExtension.DOC;
    }

    if (contentType === EContentType.APPLICATION_DOCX) {
      fileExtension = EFileExtension.DOCX;
    }

    if (contentType === EContentType.APPLICATION_XLS) {
      fileExtension = EFileExtension.XLS;
    }

    if (contentType === EContentType.APPLICATION_XLSX) {
      fileExtension = EFileExtension.XLSX;
    }

    if (contentType === EContentType.APPLICATION_PPT) {
      fileExtension = EFileExtension.PPT;
    }

    if (contentType === EContentType.APPLICATION_PPTX) {
      fileExtension = EFileExtension.PPTX;
    }

    if (contentType === EContentType.IMAGE_SVG) {
      fileExtension = EFileExtension.SVG;
    }

    if (!fileExtension) {
      throw new BadRequestException("Unknown file type!");
    }

    return fileExtension;
  }
}
