import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { COMPANY_SUPER_ADMIN_ROLES, DEFAULT_EMPTY_VALUE, ROLES_CAN_GET_NOT_OWN_PROFILES } from "src/common/constants";
import { EExtAbnStatus, EExtAbnTypeCode, EGstPayer } from "src/modules/abn/common/enums";
import {
  IAbnApiConnectionData,
  IAbnApiResponse,
  IAbnMessageWithReview,
  IAbnVerificationResponse,
} from "src/modules/abn/common/interface";
import { AbnCheck } from "src/modules/abn/entities";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { Company } from "src/modules/companies/entities";
import { EmailsService } from "src/modules/emails/services";
import { MockService } from "src/modules/mock/services";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { User } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { GetUserByAbnDto } from "src/modules/abn/common/dto";
import { UsersRolesService } from "src/modules/users-roles/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class AbnService {
  public constructor(
    @InjectRepository(AbnCheck)
    private readonly abnCheckRepository: Repository<AbnCheck>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly configService: ConfigService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly mockService: MockService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly usersRolesService: UsersRolesService,
  ) {}

  public async getUserStatus(user: ITokenUserData, dto?: OptionalUUIDParamDto): Promise<AbnCheck | null> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    let result: AbnCheck | null = null;

    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      if (!dto?.id) {
        throw new BadRequestException("Set Abn check id!");
      }

      result = await this.abnCheckRepository.findOne({
        where: { id: dto.id },
        relations: { userRole: true },
      });
    }

    if (!ROLES_CAN_GET_NOT_OWN_PROFILES.includes(userRoleName)) {
      result = await this.abnCheckRepository.findOne({
        where: {
          userRole: { userId, role: { name: userRoleName } },
        },
        relations: { userRole: true },
      });
    }

    if (result) {
      await this.usersRolesService.validateCompanyAdminForUserRole(user, result.userRole);
    }

    return result;
  }

  public async getCompanyStatus(user: ITokenUserData, companyId?: string): Promise<AbnCheck | undefined> {
    const company = await this.helperService.getCompanyByRole(user, { abnCheck: true }, companyId);

    return company?.abnCheck;
  }

  public async getIndividualAbnVerificationStatus(
    user: ITokenUserData,
    dto: GetUserByAbnDto,
  ): Promise<IAbnVerificationResponse> {
    const userRole = await this.usersRolesService.getValidatedUserRoleForRequest(dto, user, {
      profile: true,
      role: true,
      abnCheck: true,
      user: true,
    });

    if (!userRole) {
      throw new NotFoundException("User not found.");
    }

    if (userRole?.isActive && userRole?.abnCheck) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    let abnDetails: IAbnMessageWithReview;

    if (mockEnabled) {
      if (dto.abn === this.mockService.mockAbnNumber) {
        const userName = (userRole.profile.firstName + ", " + userRole.profile.lastName).toUpperCase();
        const mock = this.mockService.mockGetAbnVerificationStatus(userName);
        abnDetails = mock.result;
      }

      if (dto.abn !== this.mockService.mockAbnNumber) {
        abnDetails = await this.getAbnDetails(dto.abn);
      }
    }

    if (!mockEnabled) {
      abnDetails = await this.getAbnDetails(dto.abn);
    }

    const abnVerificationMessage = await this.verifyIndividualAbnStatus(abnDetails!, userRole, dto.abn);
    await this.createOrUpdateAbnCheck(abnDetails!, dto.isGstPayer, userRole);

    if (abnDetails!.abnStatus === EExtAbnStatus.ACTIVE) {
      await this.activationTrackingService.checkStepsEnded({
        id: userRole.user.id,
        isActive: userRole.isActive,
        email: userRole.user.email,
        role: userRole.role.name,
      });
    }

    return abnVerificationMessage;
  }

  public async getCorporateAbnVerificationStatus(
    currentClient: ITokenUserData,
    abn: string,
    isGstPayer: EGstPayer,
    companyId?: string,
  ): Promise<IAbnVerificationResponse> {
    let company: Company | null | undefined = null;

    if (currentClient.role === EUserRoleName.SUPER_ADMIN) {
      if (!companyId) {
        throw new BadRequestException("Please, set company id!");
      }

      company = await this.companyRepository.findOne({ where: { id: companyId }, relations: { abnCheck: true } });
    }

    if (COMPANY_SUPER_ADMIN_ROLES.includes(currentClient.role)) {
      const user = await this.userRepository.findOne({
        where: { id: currentClient.id },
        relations: { administratedCompany: { abnCheck: true } },
      });

      if (!user) {
        throw new NotFoundException("User not found.");
      }

      company = user.administratedCompany;
    }

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (company.status !== ECompanyStatus.REGISTERED && company.status !== ECompanyStatus.UNDER_REVIEW) {
      throw new BadRequestException("Company status does not permit this operation.");
    }

    const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

    let abnDetails: IAbnMessageWithReview;

    if (mockEnabled) {
      if (abn === this.mockService.mockAbnNumber) {
        const companyName = company.name.toUpperCase();
        const mock = this.mockService.mockGetAbnVerificationStatus(companyName);
        abnDetails = mock.result;
      }

      if (abn !== this.mockService.mockAbnNumber) {
        abnDetails = await this.getAbnDetails(abn);
      }
    }

    if (!mockEnabled) {
      abnDetails = await this.getAbnDetails(abn);
    }

    const abnVerificationMessage = await this.verifyCorporateAbnStatus(abnDetails!, company, abn);

    await this.createOrUpdateAbnCheck(abnDetails!, isGstPayer, DEFAULT_EMPTY_VALUE, company);

    return abnVerificationMessage;
  }

  private async getAbnDetails(abn: string): Promise<IAbnMessageWithReview> {
    const { baseUrl, guid } = this.configService.getOrThrow<IAbnApiConnectionData>("abn");

    const requestParams = `?abn=${encodeURIComponent(abn)}&guid=${encodeURIComponent(guid)}`;

    const response = await fetch(baseUrl + requestParams, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`HTTP error! Status: ${response.status}`);
    }

    const anbResponse = await response.text();

    const jsonMatch = anbResponse.match(/\{.*\}/)![0];
    const anbParsedResponse: IAbnApiResponse = JSON.parse(jsonMatch) as IAbnApiResponse;

    const IAbnMessageWithReview: IAbnMessageWithReview = {
      abnNumber: anbParsedResponse.Abn,
      abnStatus: anbParsedResponse.AbnStatus,
      abnStatusEffectiveFrom: anbParsedResponse.AbnStatusEffectiveFrom,
      acn: anbParsedResponse.Acn,
      addressDate: anbParsedResponse.AddressDate,
      addressPostcode: anbParsedResponse.AddressPostcode,
      addressState: anbParsedResponse.AddressState,
      businessName: anbParsedResponse.BusinessName,
      fullName: anbParsedResponse.EntityName,
      typeCode: anbParsedResponse.EntityTypeCode,
      typeName: anbParsedResponse.EntityTypeName,
      gst: anbParsedResponse.Gst,
      message: anbParsedResponse.Message,
    };

    return IAbnMessageWithReview;
  }

  private async verifyIndividualAbnStatus(
    abnDetails: IAbnMessageWithReview,
    userRole: UserRole,
    abnNumber: string,
  ): Promise<IAbnVerificationResponse> {
    try {
      if (!abnDetails.abnNumber || (abnDetails.message && abnDetails.message.includes("not a valid ABN or ACN"))) {
        throw new NotFoundException("Not Found. Invalid ABN number provided.");
      }

      if (abnDetails.abnStatus === EExtAbnStatus.CANCELLED) {
        throw new BadRequestException("The ABN registration has been cancelled.");
      }

      const fullNameFromAbn = abnDetails.fullName.toUpperCase();
      const userFullName1 = (userRole.profile.firstName + ", " + userRole.profile.lastName).toUpperCase();
      const userFullName2 = (userRole.profile.lastName + ", " + userRole.profile.firstName).toUpperCase();

      if (fullNameFromAbn !== userFullName1 && fullNameFromAbn !== userFullName2) {
        throw new BadRequestException("The name from ABN does not match the name entered by the user.");
      }

      if (abnDetails.typeCode !== EExtAbnTypeCode.IND) {
        void this.sendEmailsToAdminsInBackground(
          userRole.profile.firstName,
          userRole.profile.lastName,
          userRole.user.platformId,
          abnDetails.typeCode,
        );
      }

      return {
        message: "ABN verified successfully.",
      };
    } catch (error) {
      await this.logAbnCheckError((error as Error).message, abnNumber, userRole);
      throw error;
    }
  }

  private async verifyCorporateAbnStatus(
    abnDetails: IAbnMessageWithReview,
    company: Company,
    abnNumber: string,
  ): Promise<IAbnVerificationResponse> {
    try {
      if (!abnDetails.abnNumber || (abnDetails.message && abnDetails.message.includes("not a valid ABN or ACN"))) {
        throw new NotFoundException("Not Found. Invalid ABN number provided.");
      }

      if (abnDetails.abnStatus === EExtAbnStatus.CANCELLED) {
        throw new BadRequestException("The ABN registration has been cancelled.");
      }

      const fullNameFromAbn = abnDetails.fullName.toUpperCase();
      const companyFullName = company.name.toUpperCase();

      if (fullNameFromAbn !== companyFullName) {
        throw new BadRequestException("The name from ABN does not match the company name entered by the user.");
      }

      return {
        message: "ABN verified successfully.",
      };
    } catch (error) {
      await this.logAbnCheckError((error as Error).message, abnNumber, DEFAULT_EMPTY_VALUE, company);
      throw error;
    }
  }

  private async createOrUpdateAbnCheck(
    abnDetails: IAbnMessageWithReview,
    gstPayer?: EGstPayer,
    userRole?: UserRole,
    company?: Company,
  ): Promise<void> {
    if (!userRole && !company) {
      throw new BadRequestException("You don't have permission to use this action.");
    }

    let existingAbnCheck: AbnCheck | null = null;

    if (userRole) {
      existingAbnCheck = await this.abnCheckRepository.findOne({
        where: { userRole: { id: userRole.id } },
      });
    }

    if (company) {
      existingAbnCheck = await this.abnCheckRepository.findOne({
        where: { company: { superAdminId: company?.superAdminId } },
      });
    }

    if (!existingAbnCheck) {
      const createAbnCheck = this.abnCheckRepository.create({
        userRole: userRole,
        company: company,
        gstFromClient: gstPayer ?? null,
        ...abnDetails,
      });
      await this.abnCheckRepository.save(createAbnCheck);
    }

    if (existingAbnCheck) {
      let gstFromClient = existingAbnCheck.gstFromClient;

      if (gstPayer) {
        gstFromClient = gstPayer;
      }

      await this.abnCheckRepository.update(existingAbnCheck.id, { ...abnDetails, gstFromClient });
    }
  }

  public async logAbnCheckError(
    errorMessage: string,
    abnNumber: string,
    userRole?: UserRole,
    company?: Company,
  ): Promise<void> {
    if (!userRole && !company) {
      throw new BadRequestException("You don't have permission to use this action.");
    }

    let existingAbnCheck: AbnCheck | null = null;

    if (userRole) {
      existingAbnCheck = await this.abnCheckRepository.findOne({
        where: { userRole: { id: userRole.id } },
      });
    }

    if (company) {
      existingAbnCheck = await this.abnCheckRepository.findOne({
        where: { company: { superAdminId: company?.superAdminId } },
      });
    }

    if (existingAbnCheck) {
      await this.abnCheckRepository.update(existingAbnCheck.id, {
        abnNumber: abnNumber,
        abnStatus: null,
        abnStatusEffectiveFrom: null,
        acn: null,
        addressDate: null,
        addressPostcode: null,
        addressState: null,
        businessName: null,
        fullName: null,
        typeCode: null,
        typeName: null,
        gst: null,
        message: errorMessage,
      });
    }

    if (!existingAbnCheck) {
      const newAbnCheck = this.abnCheckRepository.create({
        userRole: userRole,
        company: company,
        abnNumber: abnNumber,
        abnStatus: null,
        abnStatusEffectiveFrom: null,
        acn: null,
        addressDate: null,
        addressPostcode: null,
        addressState: null,
        businessName: null,
        fullName: null,
        typeCode: null,
        typeName: null,
        gst: null,
        message: errorMessage,
      });

      await this.abnCheckRepository.save(newAbnCheck);
    }
  }

  private async sendEmailsToAdminsInBackground(
    firstName: string,
    lastName: string,
    platformId: string,
    abnTypeCode: string,
  ): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendAbnNotifyToAdmin(superAdmin.email, firstName, lastName, platformId, abnTypeCode);
    }
  }

  public async removeAbnCheck(id: string): Promise<void> {
    const abnCheck = await this.abnCheckRepository.findOne({ where: { id }, relations: { userRole: true } });

    if (!abnCheck) {
      throw new NotFoundException("ABN Check not found.");
    }

    await this.abnCheckRepository.remove(abnCheck);

    return;
  }
}
