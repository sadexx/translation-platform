import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ICompanyActivationStepsDataInterface,
  IStepInformation,
} from "src/modules/account-activation/common/interfaces";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsRelations, Repository } from "typeorm";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { StepInfoService } from "src/modules/account-activation/services";
import { Company } from "src/modules/companies/entities";
import { FinishCompanyActivationStepsOutput } from "src/modules/account-activation/common/outputs";
import { UserRole } from "src/modules/users-roles/entities";
import { CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES } from "src/modules/companies/common/constants/constants";
import { ECompanyStatus, ECompanyType } from "src/modules/companies/common/enums";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { COMPANY_SUPER_ADMIN_ROLES } from "src/common/constants";

@Injectable()
export class CompanyActivationService {
  constructor(
    private readonly stepInfoService: StepInfoService,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly helperService: HelperService,
  ) {}

  public async getActivationSteps(
    companyId: string,
    user: ITokenUserData,
  ): Promise<ICompanyActivationStepsDataInterface> {
    const relations: FindOptionsRelations<Company> = {
      address: true,
      documents: true,
      abnCheck: true,
      contract: true,
      paymentInformation: true,
      superAdmin: {
        userRoles: {
          role: true,
        },
      },
    };

    const company = await this.helperService.getCompanyByRole(user, relations, companyId);

    if (!company) {
      throw new NotFoundException("Company with this id doesn`t exist");
    }

    let accountActivationSteps: ICompanyActivationStepsDataInterface | null = null;

    if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      accountActivationSteps = this.stepInfoService.getCorporateInterpretingProviderCorporateClientsSteps(company);
    } else {
      accountActivationSteps = this.stepInfoService.getCorporateSteps(company);
    }

    if (!accountActivationSteps) {
      throw new BadRequestException("Steps for this company not finded!");
    }

    return accountActivationSteps;
  }

  public async activate(companyId: string, user: ITokenUserData): Promise<FinishCompanyActivationStepsOutput> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: {
        address: true,
        documents: true,
        abnCheck: true,
        contract: true,
        superAdmin: {
          userRoles: {
            role: true,
          },
        },
        depositCharge: true,
        paymentInformation: true,
      },
    });

    if (!company) {
      throw new NotFoundException("Company with this id doesn`t exist");
    }

    if (CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
        const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

        if (!personalUserRole) {
          throw new BadRequestException("Operator company admin not exist!");
        }

        if (company.operatedBy !== personalUserRole.operatedByCompanyId) {
          throw new ForbiddenException("Forbidden request!");
        }
      } else {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    if (company.isActive) {
      throw new BadRequestException("This company is already active");
    }

    const companyActivationSteps = await this.getActivationSteps(companyId, user);

    const checkActivationCriteriaResult = this.checkActivationCriteria(companyActivationSteps);

    if (checkActivationCriteriaResult.failed.length > 0) {
      this.throwRequiredInfoException(checkActivationCriteriaResult);
    }

    let failedActivationCriteria: string | null = null;

    if (checkActivationCriteriaResult.failed.length === 0) {
      const superAdminRole = await this.helperService.getUserRoleByName(company.superAdmin, COMPANY_SUPER_ADMIN_ROLES);

      await this.companyRepository.update({ id: company.id }, { isActive: true, status: ECompanyStatus.ACTIVE });
      await this.userRoleRepository.update(
        { id: superAdminRole.id },
        { isActive: true, isRequiredInfoFulfilled: true, accountStatus: EAccountStatus.ACTIVE },
      );

      // TODO R: send verified email to super admin
    } else {
      failedActivationCriteria = `This company in inactive. Missed activation steps: ${checkActivationCriteriaResult.failed.join(
        ", ",
      )}`;
    }

    return { failedActivationCriteria };
  }

  public async deactivate(companyId: string, user: ITokenUserData): Promise<void> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: { superAdmin: { userRoles: { role: true } } },
    });

    if (!company) {
      throw new NotFoundException("Company with this id doesn`t exist");
    }

    if (CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
        const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

        if (!personalUserRole) {
          throw new BadRequestException("Operator company admin not exist!");
        }

        if (company.operatedBy !== personalUserRole.operatedByCompanyId) {
          throw new ForbiddenException("Forbidden request!");
        }
      } else {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    if (!company.isActive) {
      throw new BadRequestException("This company is not active");
    }

    const superAdminRole = await this.helperService.getUserRoleByName(company.superAdmin, COMPANY_SUPER_ADMIN_ROLES);

    await this.companyRepository.update(
      { id: companyId },
      { isActive: false, lastDeactivationDate: new Date(), status: ECompanyStatus.DEACTIVATED },
    );
    await this.userRoleRepository.update(
      { id: superAdminRole.id },
      { isActive: false, accountStatus: EAccountStatus.DEACTIVATED },
    );
    // TODO: send deactivated email to super admin

    return;
  }

  public throwRequiredInfoException(criteria: { passed: string[]; failed: string[] }): void {
    let message = `Required information wasn't provided.`;

    if (criteria.passed.length > 0) {
      message += ` Passed steps: ${criteria.passed.join(", ")}.`;
    }

    message += ` Missed steps: ${criteria.failed.join(", ")}`;
    throw new ForbiddenException(message);
  }

  public checkActivationCriteria(
    companyActivationSteps: ICompanyActivationStepsDataInterface,
    isContractNeed: boolean = true,
  ): {
    passed: string[];
    failed: string[];
  } {
    const passed: string[] = [];
    const failed: string[] = [];

    if (!isContractNeed) {
      delete companyActivationSteps.docusignContractFulfilled;
    }

    Object.keys(companyActivationSteps).forEach((stepName) => {
      const step = (companyActivationSteps as unknown as Record<string, IStepInformation>)[stepName];

      if (step.isBlockAccountActivation) {
        if (step.status === EStepStatus.SUCCESS) {
          passed.push(stepName);
        }

        if (step.status !== EStepStatus.SUCCESS) {
          failed.push(stepName);
        }
      }

      if (companyActivationSteps.documentsFulfilled?.status === EStepStatus.PENDING) {
        failed.push(stepName);
      }
    });

    return { passed, failed };
  }
}
