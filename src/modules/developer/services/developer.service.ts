import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { JwtRegistrationService } from "src/modules/tokens/common/libs/registration-token";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { RegisterCompanyDto, RegisterLfhSuperAdminDto } from "src/modules/developer/common/dto";
import { ECompanyType } from "src/modules/companies/common/enums";
import { IStartRegistrationSessionData } from "src/modules/auth/common/interfaces";
import { Company } from "src/modules/companies/entities";
import { DeveloperSdkService } from "src/modules/developer/services";
import { DocusignContract } from "src/modules/docusign/entities";
import { ENVIRONMENT } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class DeveloperService {
  private readonly lokiLogger = new LokiLogger(DeveloperService.name);
  private readonly ADMIN_PHONE = "+380990000000";

  public constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    private readonly jwtRegistrationService: JwtRegistrationService,
    private readonly developerSdkService: DeveloperSdkService,
  ) {}

  public async registerLfhSuperAdmin({ email, password }: RegisterLfhSuperAdminDto): Promise<object> {
    await this.checkStage();

    this.lokiLogger.debug("Start LFH super admin registration");

    await this.developerSdkService.superAdminRegistration(email);

    this.lokiLogger.debug("1. LFH super admin registration link sent");

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException("User not created");
    }

    const registrationToken = await this.jwtRegistrationService.signAsync({
      email,
      userId: user.id,
      userRole: EUserRoleName.SUPER_ADMIN,
      // clientIPAddress,
      // clientUserAgent,
    });

    await this.developerSdkService.createPassword(password, registrationToken);

    this.lokiLogger.debug("2. LFH super admin password created");

    await this.developerSdkService.addPhone(this.ADMIN_PHONE, registrationToken);

    this.lokiLogger.debug("3. LFH super admin phone added");

    await this.developerSdkService.verifyPhone(registrationToken);

    this.lokiLogger.debug("4. LFH super admin phone verified");

    await this.developerSdkService.conditionsAgreement(registrationToken);

    this.lokiLogger.debug("5. LFH super admin condition agreement accepted");

    const finishRegistrationResponse = await this.developerSdkService.finishRegistration(registrationToken);

    this.lokiLogger.debug("6. LFH super admin registration finished");

    const accessToken = finishRegistrationResponse.accessToken;

    await this.developerSdkService.createProfile(accessToken);

    this.lokiLogger.debug("7. LFH super admin profile created");

    const loginResponse = await this.developerSdkService.login(email, password);

    this.lokiLogger.debug("8. LFH super admin login success");

    this.lokiLogger.debug("Finish LFH super admin registration");

    return loginResponse;
  }

  public async registerCompany(dto: RegisterCompanyDto): Promise<object> {
    await this.checkStage();

    this.lokiLogger.debug("Start company registration");

    const lfhSuperAdminLoginResponse = await this.developerSdkService.login(
      dto.lfhSuperAdminEmail,
      dto.lfhSuperAdminPassword,
    );

    this.lokiLogger.debug("1. LFH super admin login success");

    const lfhSuperAdminAccessToken = lfhSuperAdminLoginResponse.accessToken;

    const createCompanyResponse = await this.developerSdkService.createCompany(
      dto.companyType,
      dto.adminEmail,
      lfhSuperAdminAccessToken,
    );

    this.lokiLogger.debug("2. Company created");

    await this.developerSdkService.sendSuperAdminInvitationLink(createCompanyResponse.id, lfhSuperAdminAccessToken);

    this.lokiLogger.debug("3. Sent invitation link to company super-admin");

    let role: EUserRoleName | null = null;

    if (dto.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
      role = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;
    }

    if (dto.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      role = EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS) {
      role = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (!role) {
      throw new BadRequestException("Incorrect company type!");
    }

    const company = await this.companyRepository.findOne({
      where: { id: createCompanyResponse.id },
      relations: { superAdmin: true },
    });

    if (!company) {
      throw new BadRequestException("Company not created!");
    }

    const superAdminInvitationToken = await this.jwtRegistrationService.signAsync({
      email: company.superAdmin.email,
      userId: company.superAdmin.id,
      userRole: role,
      isInvitation: true,
      isOauth: false,
    } as IStartRegistrationSessionData);

    await this.developerSdkService.createPassword(dto.adminPassword, superAdminInvitationToken);

    this.lokiLogger.debug("4. Company super admin password created");

    await this.developerSdkService.addPhone(dto.adminPhoneNumber, superAdminInvitationToken);

    this.lokiLogger.debug("5. Company super admin phone added");

    await this.developerSdkService.verifyPhone(superAdminInvitationToken);

    this.lokiLogger.debug("6. Company super admin phone verified");

    await this.developerSdkService.conditionsAgreement(superAdminInvitationToken);

    this.lokiLogger.debug("7. Company super admin condition agreement accepted");

    const finishRegistrationResponse = await this.developerSdkService.finishRegistration(superAdminInvitationToken);

    this.lokiLogger.debug("8. Company super admin registration finished");

    const accessToken = finishRegistrationResponse.accessToken;

    await this.developerSdkService.createProfile(accessToken);

    this.lokiLogger.debug("9. Company super admin profile created");

    await this.developerSdkService.updateCompanyProfile(accessToken);

    this.lokiLogger.debug("10. Company profile updated");

    await this.developerSdkService.docusignFillCompanySigners(
      createCompanyResponse.id,
      dto.adminEmail,
      lfhSuperAdminAccessToken,
    );

    this.lokiLogger.debug("11. Company signers filled");

    const contractSentResponse = await this.developerSdkService.createAndSendCorporateContract(
      createCompanyResponse.id,
      lfhSuperAdminAccessToken,
    );

    this.lokiLogger.debug("12. Company contract sent");

    const contract = await this.docusignContractRepository.findOne({ where: { id: contractSentResponse.contractId } });

    if (!contract) {
      throw new BadRequestException("Contract not found!");
    }

    await this.developerSdkService.emulateWebhookCorporateContract(contract.envelopeId);

    this.lokiLogger.debug("13. Emulated contract sign");

    await this.developerSdkService.manualCheckWebhook();

    this.lokiLogger.debug("14. Start manual check webhook");

    const loginResponse = await this.developerSdkService.login(dto.adminEmail, dto.adminPassword);

    this.lokiLogger.debug("15. Company super admin login success");

    this.lokiLogger.debug("Finish company registration");

    return loginResponse;
  }

  private async checkStage(): Promise<void> {
    if (ENVIRONMENT === EEnvironment.PRODUCTION) {
      throw new ForbiddenException("Incorrect stage!");
    }
  }
}
