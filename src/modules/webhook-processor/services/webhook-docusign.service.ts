import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { IDocusignMessageInterface } from "src/modules/docusign/common/interfaces";
import { InjectRepository } from "@nestjs/typeorm";
import { DocusignContract } from "src/modules/docusign/entities";
import { Repository } from "typeorm";
import { DocusignSdkService } from "src/modules/docusign/services";
import { Message } from "@aws-sdk/client-sqs";
import { isUUID } from "class-validator";
import { EExtDocusignEvent, EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { EFileType } from "src/modules/file-management/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { FileManagementService } from "src/modules/file-management/services";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class WebhookDocusignService {
  private readonly lokiLogger = new LokiLogger(WebhookDocusignService.name);

  public constructor(
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    private readonly docusignSdkService: DocusignSdkService,
    private readonly fileManagementService: FileManagementService,
    @Inject(forwardRef(() => ActivationTrackingService))
    private readonly activationTrackingService: ActivationTrackingService,
  ) {}

  public async processDocusignWebhook(message: Message): Promise<void> {
    const docusignMessage = JSON.parse(message.Body!) as IDocusignMessageInterface;

    if (!isUUID(docusignMessage.data.envelopeId)) {
      this.lokiLogger.error(`Invalid UUID format for envelopeId: ${docusignMessage.data.envelopeId}`);

      return;
    }

    const docusignContract = await this.docusignContractRepository.findOne({
      where: { envelopeId: docusignMessage.data.envelopeId },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
        company: true,
      },
    });

    if (!docusignContract) {
      this.lokiLogger.error(`Contract with envelopeId: ${docusignMessage.data.envelopeId} not exist`);

      return;
    }

    if (!docusignContract.userRole && !docusignContract.company) {
      this.lokiLogger.error(
        `User role or company for contract with envelopeId: ${docusignMessage.data.envelopeId} not exist`,
      );

      return;
    }

    if (docusignContract.docusignStatus === EExtDocusignStatus.COMPLETED && docusignContract.s3ContractKey) {
      return;
    }

    const updateContractData: Partial<DocusignContract> = {
      docusignStatus: docusignMessage.data.envelopeSummary.status,
    };

    if (!docusignContract.sendDate && docusignMessage.data.envelopeSummary.sentDateTime) {
      updateContractData.sendDate = new Date(docusignMessage.data.envelopeSummary.sentDateTime);
    }

    if (docusignMessage.event === EExtDocusignEvent.RECIPIENT_COMPLETED) {
      updateContractData.isAtLeastOneSignersSigned = true;
    }

    if (
      docusignMessage.data.envelopeSummary.status === EExtDocusignStatus.COMPLETED &&
      docusignMessage.event === EExtDocusignEvent.ENVELOPE_COMPLETED
    ) {
      updateContractData.signDate = new Date(docusignMessage.data.envelopeSummary.completedDateTime);

      let folder: string;

      if (docusignContract.company) {
        folder = "companies/contracts";
      }

      if (docusignContract.userRole) {
        folder = `users/contracts/${docusignContract.userRole.role.name}`;
      }

      const key = await this.saveContract(docusignMessage.data.envelopeId, folder!);

      if (!key) {
        this.lokiLogger.error(`Saving file error`);

        return;
      }

      updateContractData.s3ContractKey = key;

      if (docusignContract.userRole) {
        await this.activationTrackingService.checkStepsEnded({
          role: docusignContract.userRole.role.name,
          userRoleId: docusignContract.userRole.id,
          email: docusignContract.userRole.user.email,
          id: docusignContract.userRole.userId,
          isActive: docusignContract.userRole.isActive,
        });
      }
    }

    await this.docusignContractRepository.update({ id: docusignContract.id }, updateContractData);
  }

  private async saveContract(envelopeId: string, folder: string): Promise<string | null> {
    try {
      const envelopeDocuments = await this.docusignSdkService.getDocuments(envelopeId);

      if (envelopeDocuments.envelopeDocuments.length === 0) {
        this.lokiLogger.error("This contract not contained documents, possibly docusign error");
      }

      const contractFile = await this.docusignSdkService.getContractFile(
        envelopeId,
        envelopeDocuments.envelopeDocuments[0].documentId,
      );

      return await this.fileManagementService.uploadReadableStreamToS3(
        contractFile.data,
        folder,
        contractFile.contentLength,
        contractFile.contentType,
        EFileType.CONTRACT,
      );
    } catch (error) {
      this.lokiLogger.error(`Error in saveContract: ${(error as Error).message}, ${(error as Error).stack}`);

      return null;
    }
  }
}
