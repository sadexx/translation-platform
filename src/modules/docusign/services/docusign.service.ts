import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ICreateContractInterface,
  ICreateTabInterface,
  IDocusignApiDataInterface,
  IDownloadContractInterface,
  IGetLinkToDocumentInterface,
  ISendContractInterface,
} from "src/modules/docusign/common/interfaces";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { DocusignContract } from "src/modules/docusign/entities";
import { FindOptionsWhere, Repository } from "typeorm";
import { AccountActivationService } from "src/modules/account-activation/services";
import { DocusignSdkService } from "src/modules/docusign/services";
import { ECorporateSignersCount, EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { GetContractsDto } from "src/modules/docusign/common/dto";
import { UserProfile } from "src/modules/users/entities";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { UsersRolesService } from "src/modules/users-roles/services";
import { IStepInformation } from "src/modules/account-activation/common/interfaces";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { UserRole } from "src/modules/users-roles/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Injectable()
export class DocusignService {
  public constructor(
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly configService: ConfigService,
    private readonly accountActivationService: AccountActivationService,
    private readonly docusignSdkService: DocusignSdkService,
    private readonly awsS3Service: AwsS3Service,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async createAndSendContract(user: ITokenUserData): Promise<ISendContractInterface> {
    const { contractId } = await this.createContract(user);

    return await this.fillAndSendContract(contractId, user);
  }

  public async createContract(user: ITokenUserData): Promise<ICreateContractInterface> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(userId, userRoleName, {
      profile: true,
      address: true,
    });

    if (userRole?.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    const userCountry = userRole?.address?.country;

    if (!userCountry) {
      throw new BadRequestException("User country is not defined!");
    }

    const neededSteps = await this.accountActivationService.retrieveRequiredAndActivationSteps(user);

    if (!neededSteps?.docusignContractFulfilled) {
      throw new BadRequestException("Contract is not available for this role!");
    }

    if (neededSteps?.docusignContractFulfilled?.status === EStepStatus.SUCCESS) {
      throw new BadRequestException("Contract already signed!");
    }

    delete neededSteps.docusignContractFulfilled;

    Object.keys(neededSteps).forEach((stepName) => {
      const step = (neededSteps as unknown as Record<string, IStepInformation>)[stepName];

      if (step.isBlockAccountActivation) {
        if (step.status !== EStepStatus.SUCCESS) {
          throw new BadRequestException("Not all steps are completed!");
        }
      }
    });

    const templateId = this.getTemplateId(userRoleName, userCountry);

    if (!templateId) {
      throw new BadRequestException("Contract is not available for this role!");
    }

    const { title, firstName, middleName, lastName, contactEmail } = userRole.profile;
    const signerName = `${title ? title + " " : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    if (!contactEmail) {
      throw new UnprocessableEntityException("Contact email is not specified!");
    }

    const { envelopeId, status } = await this.docusignSdkService.createEnvelope(templateId, contactEmail, signerName);

    const docusignContract = this.docusignContractRepository.create({
      userRole,
      docusignStatus: status,
      envelopeId,
    });

    const newDocusignContract = await this.docusignContractRepository.save(docusignContract);

    const editLink = await this.docusignSdkService.getEnvelopeEditLink(envelopeId);

    return { contractId: newDocusignContract.id, editLink };
  }

  public async fillAndSendContract(contractId: string, user: ITokenUserData): Promise<ISendContractInterface> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const docusignContract = await this.docusignContractRepository.findOne({
      where: { id: contractId },
      relations: {
        userRole: {
          role: true,
        },
      },
    });

    if (!docusignContract) {
      throw new NotFoundException(`Contract with this id not found!`);
    }

    if (docusignContract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract already completed!`);
    }

    const contractDocuments = await this.docusignSdkService.getDocuments(docusignContract.envelopeId);

    if (!contractDocuments?.envelopeDocuments || contractDocuments.envelopeDocuments.length === 0) {
      throw new BadRequestException("Envelope not contained document!");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(userId, userRoleName, {
      profile: true,
      address: true,
    });

    const userCountry = userRole?.address?.country;

    if (!userCountry) {
      throw new BadRequestException("User country is not defined!");
    }

    if (!userRole.profile) {
      throw new BadRequestException("User profile is not defined!");
    }

    const tabs: ICreateTabInterface[] = this.getPersonalTabs(userRoleName, userCountry, userRole.profile);

    const recipientId = await this.docusignSdkService.getEnvelopeRecipient(docusignContract.envelopeId);

    await this.docusignSdkService.addTabsToEnvelope(docusignContract.envelopeId, recipientId, tabs);

    await this.docusignSdkService.sendEnvelope(docusignContract.envelopeId);

    return { contractId: docusignContract.id };
  }

  public async callback(): Promise<string> {
    await this.docusignSdkService.auth();

    return "Access successfully granted, you can continue using app";
  }

  public async downloadContract(contractId: string, user: ITokenUserData): Promise<IDownloadContractInterface> {
    let contract: DocusignContract | null = null;

    if (user.role === EUserRoleName.SUPER_ADMIN) {
      contract = await this.docusignContractRepository.findOne({
        where: {
          id: contractId,
        },
      });
    }

    if (user.role !== EUserRoleName.SUPER_ADMIN) {
      const userRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!userRole) {
        throw new BadRequestException("User role not exists!");
      }

      contract = await this.docusignContractRepository.findOne({
        where: [
          {
            id: contractId,
            userRole: { userId: user.id, role: { name: user.role } },
          },
          {
            id: contractId,
            company: { id: userRole.operatedByCompanyId },
          },
        ],
      });
    }

    if (!contract) {
      throw new NotFoundException(`Contract with this id not exist!`);
    }

    if (contract.docusignStatus !== EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract with this id not completed!`);
    }

    if (!contract.s3ContractKey) {
      throw new UnprocessableEntityException(`File of this contract saved with error!`);
    }

    const fileLink = await this.awsS3Service.getShortLivedSignedUrl(contract.s3ContractKey);

    return { link: fileLink };
  }

  public async resendContract(contractId: string, user: ITokenUserData): Promise<void> {
    // Improvements for companies contracts: get all recipients from some table, and update all
    if (!user.id) {
      throw new BadRequestException("User is not defined!");
    }

    const contract = await this.docusignContractRepository.findOneBy({
      id: contractId,
    });

    if (!contract) {
      throw new NotFoundException(`Contract with this id not exist!`);
    }

    if (contract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract with this id already completed!`);
    }

    const recipientId = await this.docusignSdkService.getEnvelopeRecipient(contract.envelopeId);

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(user.id, user.role, {
      profile: true,
    });

    await this.docusignSdkService.changeRecipients(contract.envelopeId, recipientId, userRole.profile.contactEmail);

    return;
  }

  public async getContractList(dto: GetContractsDto, user: ITokenUserData): Promise<DocusignContract[]> {
    let searchParams: FindOptionsWhere<DocusignContract> = {
      userRole: {
        userId: user.id,
        role: {
          name: user.role,
        },
      },
    };

    if (user.role === EUserRoleName.SUPER_ADMIN) {
      if (!dto.userId) {
        throw new BadRequestException("Set user id!");
      }

      searchParams = {
        userRole: {
          userId: dto.userId,
        },
      };
    }

    return await this.docusignContractRepository.find({
      take: dto.limit,
      skip: dto.offset,
      order: {
        sendDate: dto.sortOrder,
      },
      select: {
        id: true,
        docusignStatus: true,
        sendDate: true,
        signDate: true,
      },
      where: searchParams,
    });
  }

  public async getLinkToDocument(contractId: string): Promise<IGetLinkToDocumentInterface> {
    const docusignContract = await this.docusignContractRepository.findOne({
      where: { id: contractId },
      relations: {
        userRole: {
          role: true,
        },
      },
    });

    if (!docusignContract) {
      throw new NotFoundException(`Contract with this id not found!`);
    }

    const documentLink = await this.docusignSdkService.getEnvelopeEditDocumentLink(docusignContract.envelopeId);

    return { documentLink };
  }

  private getPersonalTabs(
    userRoleName: EUserRoleName,
    userCountry: string,
    userProfile: UserProfile,
  ): ICreateTabInterface[] {
    let tabs: ICreateTabInterface[] = [];

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      const { title, firstName, middleName, lastName, dateOfBirth, gender } = userProfile;
      const signerName = `${title ? title + " " : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

      tabs = [
        this.docusignSdkService.createTitleTab(title),
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createMiddleNameTab(middleName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createDateOfBirthTab(dateOfBirth),
        this.docusignSdkService.createGenderTab(gender),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];
    }

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      const { title, firstName, middleName, lastName, dateOfBirth, gender } = userProfile;
      const signerName = `${title ? title + " " : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

      tabs = [
        this.docusignSdkService.createTitleTab(title),
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createMiddleNameTab(middleName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createDateOfBirthTab(dateOfBirth),
        this.docusignSdkService.createGenderTab(gender),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      const { title, firstName, middleName, lastName, dateOfBirth, gender } = userProfile;
      const signerName = `${title ? title + " " : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

      tabs = [
        this.docusignSdkService.createTitleTab(title),
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createMiddleNameTab(middleName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createDateOfBirthTab(dateOfBirth),
        this.docusignSdkService.createGenderTab(gender),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      const { title, firstName, middleName, lastName, dateOfBirth, gender } = userProfile;
      const signerName = `${title ? title + " " : ""}${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

      tabs = [
        this.docusignSdkService.createTitleTab(title),
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createMiddleNameTab(middleName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createDateOfBirthTab(dateOfBirth),
        this.docusignSdkService.createGenderTab(gender),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];
    }

    return tabs;
  }

  public getTemplateId(
    userRoleName: EUserRoleName,
    userCountry: string,
    corporateClientCount?: ECorporateSignersCount,
  ): string | null {
    const {
      indProfessionalInterpreterAustraliaTemplateId,
      indProfessionalInterpreterDifferentCountryTemplateId,
      indLanguageBuddyAustraliaTemplateId,
      indLanguageBuddyDifferentCountryTemplateId,
      corporateClientsSuperAdminAustraliaTemplateId,
      corporateClientsSuperAdminDifferentCountryTemplateId,
      corporateInterpretingProvidersSuperAdminAustraliaTemplateId,
      corporateInterpretingProvidersSuperAdminDifferentCountryTemplateId,
      corporateClientsSuperAdminAustraliaSingleTemplateId,
      corporateClientsSuperAdminDifferentCountrySingleTemplateId,
      corporateInterpretingProvidersSuperAdminAustraliaSingleTemplateId,
      corporateInterpretingProvidersSuperAdminDifferentCountrySingleTemplateId,
    } = this.configService.getOrThrow<IDocusignApiDataInterface>("docusign");

    let templateId: string | null = null;

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indProfessionalInterpreterAustraliaTemplateId;
    }

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indProfessionalInterpreterDifferentCountryTemplateId;
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indLanguageBuddyAustraliaTemplateId;
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indLanguageBuddyDifferentCountryTemplateId;
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateClientsSuperAdminAustraliaSingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateClientsSuperAdminAustraliaTemplateId;
      }
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateClientsSuperAdminDifferentCountrySingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateClientsSuperAdminDifferentCountryTemplateId;
      }
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateInterpretingProvidersSuperAdminAustraliaSingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateInterpretingProvidersSuperAdminAustraliaTemplateId;
      }
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateInterpretingProvidersSuperAdminDifferentCountrySingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateInterpretingProvidersSuperAdminDifferentCountryTemplateId;
      }
    }

    return templateId;
  }
}
