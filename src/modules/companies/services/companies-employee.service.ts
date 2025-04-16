import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailsService } from "src/modules/emails/services";
import { CreateEmployeeDto, SendEmployeeInvitationLinkDto } from "src/modules/companies/common/dto";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";
import {
  ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING,
  ALLOWED_CORPORATE_CLIENTS_EMPLOYEE_ROLES,
  ALLOWED_CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_EMPLOYEE_ROLES,
  ALLOWED_CORPORATE_INTERPRETING_PROVIDERS_EMPLOYEE_ROLES,
} from "src/modules/companies/common/constants/constants";
import { ECompanyStatus, ECompanyType } from "src/modules/companies/common/enums";
import { RegistrationLinkService } from "src/modules/auth/services";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { SendEmployeeInvitationLinkOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UserProfilesService } from "src/modules/users/services";
import { INTERPRETER_AND_CLIENT_ROLES } from "src/common/constants";
import { Address } from "src/modules/addresses/entities";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class CompaniesEmployeeService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly userAvatarsService: UserAvatarsService,
    private readonly emailsService: EmailsService,
    private readonly registrationLinkService: RegistrationLinkService,
    private readonly userProfilesService: UserProfilesService,
    private readonly helperService: HelperService,
  ) {}

  public async createEmployee(
    dto: CreateEmployeeDto,
    currentUser: ITokenUserData,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    const company = await this.helperService.getCompanyByRole(currentUser, {}, dto.id);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (company.status !== ECompanyStatus.ACTIVE) {
      throw new BadRequestException("Company not activated!");
    }

    if (
      (company.companyType === ECompanyType.CORPORATE_CLIENTS &&
        !ALLOWED_CORPORATE_CLIENTS_EMPLOYEE_ROLES.includes(dto.role)) ||
      (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS &&
        !ALLOWED_CORPORATE_INTERPRETING_PROVIDERS_EMPLOYEE_ROLES.includes(dto.role)) ||
      (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
        !ALLOWED_CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_EMPLOYEE_ROLES.includes(dto.role))
    ) {
      throw new BadRequestException("This company does not have this role!");
    }

    const { user, userIsAlreadyExist, createdUserRole } = await this.registrationLinkService.prepareUserAndRole(
      dto.email,
      dto.role,
      { phoneNumber: dto.phoneNumber },
    );

    const newAddress = this.addressRepository.create(dto.businessAddress);

    const address = await this.addressRepository.save(newAddress);

    const profile = await this.userProfilesService.constructAndCreateUserProfile(dto.profileInformation);

    const userRole = await this.userRoleRepository.save({
      ...createdUserRole,
      address,
      profile,
      operatedByCompanyId: company.id,
      operatedByCompanyName: company.name,
    });

    await this.userAvatarsService.setDefaultUserAvatar(user.id, profile.gender);

    return await this.sendEmployeeInvitationLink({ userRoleId: userRole.id }, userIsAlreadyExist);
  }

  public async resendEmployeeInvitationLink(
    dto: SendEmployeeInvitationLinkDto,
    currentUser: ITokenUserData,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id: dto.userRoleId },
      relations: { user: true },
    });

    if (!userRole) {
      throw new NotFoundException("Role not found!");
    }

    await this.registrationLinkService.checkInvitationLinkTimeLimit(userRole);

    await this.helperService.getCompanyByRole(currentUser, {}, userRole.operatedByCompanyId);

    return await this.sendEmployeeInvitationLink(dto, userRole.user.isRegistrationFinished);
  }

  public async deleteById(id: string, user: ITokenUserData): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id },
      relations: { user: { userRoles: true }, role: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role with this id not found!");
    }

    if (!ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING.includes(userRole.accountStatus)) {
      throw new BadRequestException("User role with such account status cannot be deleted immediately!");
    }

    if (INTERPRETER_AND_CLIENT_ROLES.includes(userRole.role.name)) {
      await this.helperService.checkIfUserHasUncompletedAppointmentsBeforeDelete(userRole.id);
    }

    await this.helperService.getCompanyByRole(user, {}, userRole.operatedByCompanyId);

    if (userRole.user.userRoles.length > 1) {
      await this.userRoleRepository.delete({ id: userRole.id });
    }

    if (userRole.user.userRoles.length <= 1) {
      await this.userRepository.delete({ id: userRole.userId });
    }

    return;
  }

  private async sendEmployeeInvitationLink(
    dto: SendEmployeeInvitationLinkDto,
    userIsAlreadyExist: boolean,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id: dto.userRoleId },
      relations: { user: true, role: true, profile: true },
    });

    if (!userRole) {
      throw new BadRequestException("This role is not exist!");
    }

    const { registrationLink, linkDurationString } = await this.registrationLinkService.generateRegistrationLink(
      userRole.user.email,
      userRole.user.id,
      userRole.role.name,
      userIsAlreadyExist,
    );

    await this.emailsService.sendCompanyEmployeeInvitationLink(
      userRole.user.email,
      registrationLink,
      linkDurationString,
      `${userRole.profile.firstName} ${userRole.profile.lastName}`,
      userRole.role.name,
      userRole.operatedByCompanyName,
    );

    const linkCreationTime = new Date();

    await this.userRoleRepository.update(
      { id: dto.userRoleId },
      { accountStatus: EAccountStatus.INVITATION_LINK, invitationLinkWasCreatedAt: linkCreationTime },
    );

    return {
      id: dto.userRoleId,
      linkCreationTime,
    };
  }
}
