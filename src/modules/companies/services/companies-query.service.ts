import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { FindOptionsRelations, Repository } from "typeorm";
import { Company, CompanyDocument } from "src/modules/companies/entities";
import { IGetMyCompany } from "src/modules/companies/common/interfaces";
import { InjectRepository } from "@nestjs/typeorm";
import {
  COMPANY_LFH_ID,
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES,
} from "src/modules/companies/common/constants/constants";
import { UserRole } from "src/modules/users-roles/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { GetCompaniesDto, GetEmployeesDto } from "src/modules/companies/common/dto";
import { GetCompaniesOutput, GetDocumentOutput, GetEmployeesOutput } from "src/modules/companies/common/outputs";
import { CompaniesQueryOptionsService } from "src/modules/companies/services";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class CompaniesQueryService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyDocument)
    private readonly companyDocumentRepository: Repository<CompanyDocument>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly companiesQueryOptionsService: CompaniesQueryOptionsService,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
  ) {}

  /**
   ** CompanyService
   */

  public async getCompany(
    id: string,
    user: ITokenUserData,
    relations: FindOptionsRelations<Company> = {
      address: true,
      contract: true,
      contractSigners: true,
      documents: true,
      abnCheck: true,
      superAdmin: {
        avatar: true,
      },
      paymentInformation: true,
    },
  ): Promise<IGetMyCompany | null> {
    const company: IGetMyCompany | null = await this.companyRepository.findOne({
      where: { id },
      relations,
      select: {
        paymentInformation: {
          interpreterSystemForPayout: true,
          note: true,
          paypalEmail: true,
          stripeClientLastFour: true,
          stripeInterpreterBankAccountLast4: true,
          stripeInterpreterCardLast4: true,
          stripeInterpreterOnboardingStatus: true,
        },
      },
    });

    if (company && CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!personalUserRole) {
        throw new BadRequestException("Operator company admin not exist!");
      }

      if (personalUserRole.operatedByCompanyId !== company.operatedBy) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    if (company) {
      const parentCompany = await this.companyRepository.findOne({ where: { id: company.operatedBy } });

      if (parentCompany) {
        company.operatedByPlatformId = parentCompany.platformId;
        company.operatedByCompanyName = parentCompany.name;
      }
    }

    return company;
  }

  public async getCompanyByUser(user: ITokenUserData): Promise<IGetMyCompany | null> {
    const companyRelations: FindOptionsRelations<Company> = {
      address: true,
      contract: true,
      contractSigners: true,
      documents: true,
      abnCheck: true,
      superAdmin: {
        avatar: true,
      },
    };

    let company: IGetMyCompany | null;

    if (user.role === EUserRoleName.SUPER_ADMIN) {
      company = await this.companyRepository.findOne({
        where: { id: COMPANY_LFH_ID },
        relations: companyRelations,
      });
    } else {
      const userRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!userRole) {
        throw new BadRequestException("This user not found!");
      }

      company = await this.companyRepository.findOne({
        where: { id: userRole.operatedByCompanyId },
        relations: companyRelations,
      });

      if (company) {
        const parentCompany = await this.companyRepository.findOne({ where: { id: company.operatedBy } });

        if (parentCompany) {
          company.operatedByPlatformId = parentCompany.platformId;
          company.operatedByCompanyName = parentCompany.name;
        }
      }
    }

    return company;
  }

  public async getCompanyByPhoneNumber(phoneNumber: string): Promise<Company | null> {
    return await this.companyRepository.findOneBy({ phoneNumber });
  }

  public async getCompanies(dto: GetCompaniesDto, user: ITokenUserData): Promise<GetCompaniesOutput> {
    const queryBuilder = this.companyRepository.createQueryBuilder("company");
    this.companiesQueryOptionsService.getCompaniesOptions(queryBuilder, dto);

    if (CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!personalUserRole) {
        throw new BadRequestException("Operator company admin not exist!");
      }

      queryBuilder.andWhere("company.operatedBy = :operatedBy", {
        operatedBy: personalUserRole.operatedByCompanyId,
      });
    }

    const [companies, count] = await queryBuilder.getManyAndCount();

    for (const company of companies) {
      const parentCompany = await this.companyRepository.findOne({ where: { id: company.operatedBy } });

      if (parentCompany) {
        (company as IGetMyCompany).operatedByPlatformId = parentCompany.platformId;
        (company as IGetMyCompany).operatedByCompanyName = parentCompany.name;
      }
    }

    return { data: companies, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getSuperAdminByCompanyId(id: string, user: ITokenUserData): Promise<UserRole | null> {
    const company = await this.companyRepository.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

    if (!personalUserRole) {
      throw new BadRequestException("User not found!");
    }

    if (personalUserRole.operatedByCompanyId !== company.operatedBy) {
      throw new ForbiddenException("Forbidden request!");
    }

    const userRole = await this.userRoleRepository.findOne({
      where: {
        userId: company.superAdminId,
        operatedByCompanyId: company.id,
        role: { name: EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN },
      },
      relations: {
        profile: true,
        address: true,
        user: true,
        questionnaire: {
          recommendations: true,
        },
      },
      select: {
        id: true,
        isUserAgreedToTermsAndConditions: true,
        isRegistrationFinished: true,
        isRequiredInfoFulfilled: true,
        isActive: true,
        accountStatus: true,
        lastDeactivationDate: true,
      },
    });

    return userRole;
  }

  /**
   ** CompaniesEmployeeService
   */

  public async getAllEmployees(dto: GetEmployeesDto, user: ITokenUserData): Promise<GetEmployeesOutput> {
    const company = await this.helperService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const queryBuilder = this.userRoleRepository
      .createQueryBuilder("userRole")
      .where("userRole.operatedByCompanyId = :companyId", { companyId: company.id });

    this.companiesQueryOptionsService.getAllEmployeesOptions(queryBuilder, dto);

    const [userRoles, count] = await queryBuilder.getManyAndCount();

    return { data: userRoles, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getById(id: string, user: ITokenUserData): Promise<UserRole | null> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id },
      relations: { address: true, profile: true, user: { avatar: true }, role: true, interpreterProfile: true },
    });

    if (userRole) {
      await this.helperService.getCompanyByRole(user, {}, userRole.operatedByCompanyId);
    }

    return userRole;
  }

  /**
   ** CompaniesDocumentsService
   */

  public async getDocs(user: ITokenUserData, companyId?: string): Promise<CompanyDocument[]> {
    const company = await this.helperService.getCompanyByRole(user, { documents: true }, companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    return company.documents;
  }

  public async getDoc(id: string, user: ITokenUserData): Promise<GetDocumentOutput> {
    const document = await this.companyDocumentRepository.findOne({ where: { id }, relations: { company: true } });

    if (!document) {
      throw new NotFoundException("Document not found!");
    }

    await this.helperService.getCompanyByRole(user, {}, document.company.id);

    const downloadLink = await this.awsS3Service.getShortLivedSignedUrl(document.s3Key);

    return { ...document, downloadLink };
  }
}
