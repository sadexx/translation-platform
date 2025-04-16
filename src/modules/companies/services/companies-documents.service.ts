import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyDocument } from "src/modules/companies/entities";
import { UploadDocDto } from "src/modules/companies/common/dto";
import { IFile } from "src/modules/file-management/common/interfaces";
import { ECompanyDocumentStatus, ECompanyType } from "src/modules/companies/common/enums";
import {
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES,
  LFH_PERSONAL_ROLES,
} from "src/modules/companies/common/constants/constants";
import { UserRole } from "src/modules/users-roles/entities";
import { CompanyDocumentIdOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class CompaniesDocumentsService {
  constructor(
    @InjectRepository(CompanyDocument)
    private readonly companyDocumentRepository: Repository<CompanyDocument>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly helperService: HelperService,
  ) {}

  public async uploadDoc(dto: UploadDocDto, file: IFile, user: ITokenUserData): Promise<CompanyDocumentIdOutput> {
    if (!file) {
      throw new BadRequestException("File not received!");
    }

    const company = await this.helperService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    let documentStatus = ECompanyDocumentStatus.PENDING;

    if (
      LFH_PERSONAL_ROLES.includes(user.role) ||
      company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS
    ) {
      documentStatus = ECompanyDocumentStatus.VERIFIED;
    }

    const document = this.companyDocumentRepository.create({
      type: dto.type,
      s3Key: file.key,
      company: company,
      status: documentStatus,
    });
    const newDocument = await this.companyDocumentRepository.save(document);

    return { id: newDocument.id };
  }

  public async approveDoc(id: string): Promise<void> {
    const document = await this.companyDocumentRepository.findOne({ where: { id }, relations: { company: true } });

    if (!document) {
      throw new NotFoundException("Document not found!");
    }

    await this.companyDocumentRepository.update({ id }, { status: ECompanyDocumentStatus.VERIFIED });

    return;
  }

  public async removeDoc(id: string, user: ITokenUserData): Promise<void> {
    const document = await this.companyDocumentRepository.findOne({ where: { id }, relations: { company: true } });

    if (!document) {
      throw new NotFoundException("Document not found!");
    }

    if (
      document.company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
      CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES.includes(user.role)
    ) {
      const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!personalUserRole) {
        throw new BadRequestException("Operator company admin not exist!");
      }

      if (document.company.operatedBy !== personalUserRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    await this.companyDocumentRepository.delete({ id });

    return;
  }
}
