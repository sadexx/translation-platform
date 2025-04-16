import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStartRegistrationSessionData } from "src/modules/auth/common/interfaces";
import { Company } from "src/modules/companies/entities";
import { JwtRegistrationService } from "src/modules/tokens/common/libs/registration-token";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { EmailsService } from "src/modules/emails/services";
import {
  CompanyAdminRole,
  ECompanyActivitySphere,
  ECompanyEmployeesNumber,
  ECompanyStatus,
  ECompanyType,
} from "src/modules/companies/common/enums";
import {
  CreateCompanyDto,
  CreateCompanyRegistrationRequestDto,
  DeleteCompanyDto,
  UpdateCompanyProfileDto,
  UpdateCompanyRegistrationRequestDto,
  UpdateCompanySubStatusDto,
} from "src/modules/companies/common/dto";
import { User } from "src/modules/users/entities";
import {
  REGISTRATION_TOKEN_QUERY_PARAM,
  RESTORATION_TOKEN_QUERY_PARAM,
  RESTORATION_TYPE,
  ROLE_QUERY_PARAM,
} from "src/modules/auth/common/constants/constants";
import { ICreateCompanyAdminData } from "src/modules/users/common/interfaces";
import { Address } from "src/modules/addresses/entities";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { UserRole } from "src/modules/users-roles/entities";
import {
  COMPANY_LFH_FULL_NAME,
  COMPANY_LFH_ID,
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES,
  RESTRICTED_COMPANY_NAMES,
} from "src/modules/companies/common/constants/constants";
import { EExtCountry } from "src/modules/addresses/common/enums";
import {
  COMPANY_SUPER_ADMIN_ROLES,
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_SECONDS_IN_DAY,
} from "src/common/constants";
import { UsersRolesService } from "src/modules/users-roles/services";
import { JwtRestorationService } from "src/modules/tokens/common/libs/restoration-token";
import { ERestorationType } from "src/modules/users/common/enums";
import { CompanyIdOutput, SendInvitationLinkOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { CompaniesQueryService } from "src/modules/companies/services";
import { LokiLogger } from "src/common/logger";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";

@Injectable()
export class CompaniesService {
  private readonly lokiLogger = new LokiLogger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly companiesDepositChargeService: CompaniesDepositChargeService,
    private readonly companiesQueryService: CompaniesQueryService,
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
    private readonly jwtRegistrationService: JwtRegistrationService,
    private readonly jwtRestorationService: JwtRestorationService,
    private readonly usersRolesService: UsersRolesService,
    private readonly helperService: HelperService,
  ) {}

  public async createCompanyRegistrationRequest(dto: CreateCompanyRegistrationRequestDto): Promise<CompanyIdOutput> {
    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS && !dto.activitySphere) {
      throw new BadRequestException("activitySphere is required for corporate clients");
    }

    if (RESTRICTED_COMPANY_NAMES.includes(dto.name.toUpperCase())) {
      throw new BadRequestException("Reserved company name!");
    }

    const existedCompany = await this.companiesQueryService.getCompanyByPhoneNumber(dto.phoneNumber);

    if (existedCompany) {
      throw new BadRequestException("Company with such phone number already exists");
    }

    const company = this.companyRepository.create({
      name: dto.name,
      contactPerson: dto.contactPerson,
      phoneNumber: dto.phoneNumber,
      contactEmail: dto.contactEmail,
      country: dto.country,
      activitySphere: dto.activitySphere,
      employeesNumber: dto.employeesNumber,
      companyType: dto.companyType,
      operatedBy: COMPANY_LFH_ID,
    });

    const newCompany: Company = await this.companyRepository.save(company);

    return { id: newCompany.id };
  }

  public async updateCompanyRegistrationRequest(dto: UpdateCompanyRegistrationRequestDto): Promise<CompanyIdOutput> {
    if (dto.name && RESTRICTED_COMPANY_NAMES.includes(dto.name.toUpperCase())) {
      throw new BadRequestException("Reserved company name!");
    }

    let adminUserRole = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;

    const companyRequest = await this.companyRepository.findOne({ where: { id: dto.id } });

    if (companyRequest?.superAdminId) {
      delete dto.country;
    }

    if (!companyRequest) {
      throw new NotFoundException("Company with this id not found!");
    }

    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS) {
      adminUserRole = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    const dataForUpdate: Partial<Company> = { ...dto };
    delete dataForUpdate.depositAmount;

    if (dto.adminEmail && dto.adminName) {
      const companyDuplicate = await this.companyRepository.findOne({ where: { adminEmail: dto.adminEmail } });

      if (companyDuplicate) {
        throw new BadRequestException("Company with this admin email already exist!");
      }

      const user = await this.userRepository.findOne({
        where: { email: dto.adminEmail },
        relations: { administratedCompany: true },
      });

      if (!user) {
        const superAdmin = await this.createCompanyAdmin({
          email: dto.adminEmail,
          role: adminUserRole as unknown as CompanyAdminRole,
        });

        dataForUpdate.superAdmin = superAdmin;
      }
    }

    const updatedCompany = await this.companyRepository.save(dataForUpdate);

    if (dto.adminEmail && dto.adminName) {
      const superAdminRole = await this.helperService.getUserRoleByName(updatedCompany.superAdmin, adminUserRole);

      await this.userRoleRepository.update(
        { id: superAdminRole.id },
        { operatedByCompanyName: companyRequest.name, operatedByCompanyId: companyRequest.id },
      );
    }

    if (dto.depositDefaultChargeAmount) {
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(
        updatedCompany,
        dto.depositDefaultChargeAmount,
      );
    }

    return { id: companyRequest.id };
  }

  public async createCompany(dto: CreateCompanyDto, user: ITokenUserData): Promise<CompanyIdOutput> {
    if (RESTRICTED_COMPANY_NAMES.includes(dto.name.toUpperCase())) {
      throw new BadRequestException("Reserved company name!");
    }

    const existedCompany = await this.companyRepository.findOne({
      where: [{ adminEmail: dto.adminEmail }, { phoneNumber: dto.phoneNumber }],
    });

    if (existedCompany) {
      throw new BadRequestException("Company with such phone number or email already exists");
    }

    let adminUserRole = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;
    let companyOperatedBy = COMPANY_LFH_ID;

    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS) {
      adminUserRole = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (dto.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      adminUserRole = EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN;

      if (!dto.operatedBy) {
        throw new BadRequestException("operatedBy must been not empty for this role!");
      }

      const operatedByCompany = await this.companyRepository.findOne({ where: { id: dto.operatedBy } });

      if (!operatedByCompany) {
        throw new BadRequestException("Operated company not found!");
      }

      companyOperatedBy = operatedByCompany.id;

      delete dto.depositDefaultChargeAmount;
    }

    if (user.role !== EUserRoleName.SUPER_ADMIN) {
      delete dto.depositDefaultChargeAmount;
    }

    const existedSuperAdmin = await this.userRepository.findOne({
      where: { email: dto.adminEmail },
      relations: { administratedCompany: true },
    });

    if (existedSuperAdmin) {
      throw new BadRequestException("Corporate client with this email already exist!");
    }

    const superAdmin = await this.createCompanyAdmin({
      email: dto.adminEmail,
      role: adminUserRole as unknown as CompanyAdminRole,
    });

    const companyData: CreateCompanyDto = { ...dto };
    delete companyData.depositDefaultChargeAmount;

    const company = this.companyRepository.create({
      ...companyData,
      superAdmin,
      operatedBy: companyOperatedBy,
    });

    const newCompany: Company = await this.companyRepository.save(company);

    const superAdminRole = await this.helperService.getUserRoleByName(newCompany.superAdmin, adminUserRole);
    await this.userRoleRepository.update(
      { id: superAdminRole.id },
      { operatedByCompanyName: newCompany.name, operatedByCompanyId: newCompany.id },
    );

    if (dto.depositDefaultChargeAmount) {
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(newCompany, dto.depositDefaultChargeAmount);
    }

    return { id: newCompany.id };
  }

  private async createCompanyAdmin(createCompanyAdminData: ICreateCompanyAdminData): Promise<User> {
    const role = createCompanyAdminData.role as unknown as EUserRoleName;
    const userRole = await this.usersRolesService.createByRoleName(role);

    return this.userRepository.create({
      ...createCompanyAdminData,
      userRoles: [userRole],
    });
  }

  public async removeRequest(id: string, user: ITokenUserData): Promise<void> {
    const companyRequest = await this.helperService.getCompanyByRole(
      user,
      {
        superAdmin: {
          userRoles: true,
        },
      },
      id,
    );

    if (!companyRequest) {
      throw new NotFoundException("Company with id not found!");
    }

    if (
      companyRequest.status !== ECompanyStatus.NEW_REQUEST &&
      companyRequest.status !== ECompanyStatus.INVITATION_LINK_SENT
    ) {
      throw new BadRequestException("This request already accepted!");
    }

    await this.companyRepository.delete({ id });

    if (companyRequest.superAdminId) {
      await this.userRepository.delete({ id: companyRequest.superAdminId });
    }

    return;
  }

  public async updateCompanySubStatus({ id, subStatus }: UpdateCompanySubStatusDto): Promise<CompanyIdOutput> {
    const companyRequest = await this.companyRepository.findOne({ where: { id } });

    if (!companyRequest) {
      throw new NotFoundException("Company with id not found!");
    }

    await this.companyRepository.update({ id }, { subStatus });

    return { id: companyRequest.id };
  }

  public async sendSuperAdminInvitationLink(id: string, user: ITokenUserData): Promise<SendInvitationLinkOutput> {
    const companyRequest = await this.companiesQueryService.getCompany(id, user, { superAdmin: true, address: true });

    if (!companyRequest) {
      throw new NotFoundException("Company with this id not found!");
    }

    if (CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!personalUserRole) {
        throw new BadRequestException("Operator company admin not exist!");
      }

      if (personalUserRole.operatedByCompanyId !== companyRequest.operatedBy) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    if (!companyRequest.adminName || !companyRequest.adminEmail) {
      throw new ForbiddenException("Please, set admin name and email before sending link!");
    }

    if (
      companyRequest.status !== ECompanyStatus.NEW_REQUEST &&
      companyRequest.status !== ECompanyStatus.INVITATION_LINK_SENT
    ) {
      throw new BadRequestException("This company already registered!");
    }

    if (companyRequest.invitationLinkWasCreatedAt) {
      const MIN_TIME_LIMIT_MINUTES = 5;
      const minTimeLimit = MIN_TIME_LIMIT_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;

      const now = new Date();
      const sendingDifferent = now.getTime() - companyRequest.invitationLinkWasCreatedAt.getTime();

      if (sendingDifferent < minTimeLimit) {
        throw new BadRequestException(`Invitation link was sent less than ${MIN_TIME_LIMIT_MINUTES} minutes ago!`);
      }
    }

    let role: EUserRoleName | null = null;

    if (companyRequest.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
      role = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;
    }

    if (companyRequest.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      role = EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (companyRequest.companyType === ECompanyType.CORPORATE_CLIENTS) {
      role = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (!role) {
      throw new BadRequestException("Incorrect company type!");
    }

    const invitationToken = await this.jwtRegistrationService.signAsync({
      email: companyRequest.superAdmin.email,
      userId: companyRequest.superAdmin.id,
      userRole: role,
      isInvitation: true,
      isOauth: false,
    } as IStartRegistrationSessionData);

    const completeRegistrationLink = `${this.configService.getOrThrow<string>("frontend.inviteCompanySuperAdminRedirectionLink")}?${REGISTRATION_TOKEN_QUERY_PARAM}=${invitationToken}&${ROLE_QUERY_PARAM}=${role}`;

    const linkDurationSeconds = this.configService.getOrThrow<number>("jwt.invitation.expirationTimeSeconds");
    const linkDurationString = linkDurationSeconds / NUMBER_OF_SECONDS_IN_DAY + " days";
    await this.emailsService.sendCompanySuperAdminInvitationLink(
      companyRequest.adminEmail,
      completeRegistrationLink,
      linkDurationString,
      companyRequest.adminName,
    );

    const linkCreationTime = new Date();

    await this.companyRepository.update(
      { id },
      { status: ECompanyStatus.INVITATION_LINK_SENT, invitationLinkWasCreatedAt: linkCreationTime },
    );

    return {
      linkCreationTime,
    };
  }

  public async updateCompanyProfile(dto: UpdateCompanyProfileDto, user: ITokenUserData): Promise<void> {
    const company = await this.helperService.getCompanyByRole(
      user,
      {
        address: true,
      },
      dto?.profileInformation?.id,
    );

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (
      RESTRICTED_COMPANY_NAMES.includes(dto.profileInformation.name.toUpperCase()) &&
      user.role !== EUserRoleName.SUPER_ADMIN &&
      company.id !== COMPANY_LFH_ID
    ) {
      throw new BadRequestException("Reserved company name!");
    }

    if (
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(company.country) &&
      !dto?.profileInformation?.businessRegistrationNumber
    ) {
      throw new BadRequestException("businessRegistrationNumber is required!");
    }

    if (
      company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(company.country) &&
      !dto?.profileInformation?.abnNumber
    ) {
      throw new BadRequestException("abnNumber is required!");
    }

    if (
      company.companyType !== ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
      dto?.profileInformation?.abnNumber
    ) {
      delete dto.profileInformation.abnNumber;
    }

    if (
      user.role !== EUserRoleName.SUPER_ADMIN ||
      company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS
    ) {
      delete dto.profileInformation.depositDefaultChargeAmount;
    }

    if (dto.profileInformation) {
      Object.assign(company, {
        name: dto.profileInformation.name,
        contactPerson: dto.profileInformation.contactPerson,
        phoneNumber: dto.profileInformation.phoneNumber,
        contactEmail: dto.profileInformation.contactEmail,
        activitySphere: dto.profileInformation.activitySphere,
        employeesNumber: dto.profileInformation.employeesNumber,
        businessRegistrationNumber: dto.profileInformation.businessRegistrationNumber,
        abnNumber: dto.profileInformation.abnNumber,
      });
    }

    if (dto.residentialAddress) {
      if (
        (dto.residentialAddress.country || dto.residentialAddress.state || dto.residentialAddress.suburb) &&
        !dto.residentialAddress.timezone
      ) {
        throw new BadRequestException("Timezone must be provided when country or state or suburb is specified.");
      }

      let address: Address;

      if (company.address) {
        address = company.address;
        Object.assign(address, dto.residentialAddress);
      } else {
        address = this.addressRepository.create({ ...dto.residentialAddress });
        company.address = address;
      }

      await this.addressRepository.save(address);
    }

    await this.companyRepository.save(company);

    if (user.role === EUserRoleName.SUPER_ADMIN && dto.profileInformation.depositDefaultChargeAmount) {
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(
        company,
        dto.profileInformation.depositDefaultChargeAmount,
      );
    }

    return;
  }

  public async deleteCompanyRequest(dto: DeleteCompanyDto, user: ITokenUserData): Promise<void> {
    const company = await this.helperService.getCompanyByRole(
      user,
      {
        superAdmin: {
          userRoles: {
            role: true,
          },
        },
      },
      dto.id,
    );

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.adminEmail || !company.adminName) {
      throw new BadRequestException("Fill admin email and name, please! Or user delete request endpoint");
    }

    const restoringPeriodInSeconds = this.configService.getOrThrow<number>("jwt.restore.expirationTimeSeconds");

    await this.companyRepository.update(
      { id: company.id },
      {
        removeAllAdminRoles: dto.removeAllAdminRoles,
        isInDeleteWaiting: true,
        deletingDate: new Date(new Date().getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND),
      },
    );

    const superAdminRole = await this.helperService.getUserRoleByName(company.superAdmin, COMPANY_SUPER_ADMIN_ROLES);
    const restorationToken = await this.jwtRestorationService.signAsync({
      email: company.superAdmin.email,
      userId: company.superAdmin.id,
      userRole: superAdminRole.role.name,
      isInvitation: false,
      isOauth: false,
    } as IStartRegistrationSessionData);

    const completeRestorationLink = `${this.configService.getOrThrow<string>("frontend.restorationRedirectionLink")}?${RESTORATION_TOKEN_QUERY_PARAM}=${restorationToken}&${ROLE_QUERY_PARAM}=${superAdminRole.role.name}&${RESTORATION_TYPE}=${ERestorationType.COMPANY}`;

    const linkDurationString = restoringPeriodInSeconds / NUMBER_OF_SECONDS_IN_DAY + " days";
    await this.emailsService.sendCompanyRestorationLink(
      company.adminEmail,
      completeRestorationLink,
      linkDurationString,
      company.adminName,
    );

    return;
  }

  public async restoreCompany(user: ITokenUserData): Promise<void> {
    const company = await this.companyRepository.findOne({ where: { superAdminId: user.id } });

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (!company.isInDeleteWaiting) {
      throw new Error("Company is not deleted!");
    }

    await this.companyRepository.update(
      { id: company.id },
      { isInDeleteWaiting: false, deletingDate: null, removeAllAdminRoles: null },
    );
  }

  public async seedLfhCompanyToDatabase(): Promise<void> {
    const lfhCompany = await this.companyRepository.findOne({
      where: { id: COMPANY_LFH_ID },
    });

    if (!lfhCompany) {
      const createdAddress = this.addressRepository.create({
        latitude: -33.90098,
        longitude: 151.210495,
        country: "Australia",
        state: "New South Wales",
        suburb: "Waterloo",
        streetName: "Thread Lane",
        streetNumber: "36/1",
        postcode: "2017",
        timezone: "Australia/Sydney",
      });

      const address = await this.addressRepository.save(createdAddress);

      const createdLfhCompany = this.companyRepository.create({
        id: COMPANY_LFH_ID,
        name: COMPANY_LFH_FULL_NAME,
        phoneNumber: "+61459490550",
        contactPerson: "Rozalia Alpert",
        contactEmail: "super.admin@linguafrancahub.com",
        country: EExtCountry.AUSTRALIA,
        activitySphere: ECompanyActivitySphere.LANGUAGE_SERVICE_COMPANY,
        employeesNumber: ECompanyEmployeesNumber.MORE_THEN_EIGHT_HUNDRED,
        status: ECompanyStatus.ACTIVE,
        companyType: ECompanyType.CORPORATE_INTERPRETING_PROVIDERS,
        adminName: "Rozalia Alpert",
        adminEmail: "super.admin@linguafrancahub.com",
        operatedBy: COMPANY_LFH_ID,
        abnNumber: "42 661 208 635",
        address,
        isActive: true,
      });

      await this.companyRepository.save(createdLfhCompany);

      this.lokiLogger.log("Seeded LFH company");
    }
  }
}
