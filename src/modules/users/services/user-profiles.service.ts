import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserProfile } from "src/modules/users/entities";
import { UsersService } from "src/modules/users/services";
import { ICurrentUserData, IUserWithRoleIdAndCountry } from "src/modules/users/common/interfaces";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { UsersRolesService } from "src/modules/users-roles/services";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import {
  CreateUserProfileDto,
  CreateUserProfileInformationDto,
  GetUserProfileDto,
  UpdateUserProfileDto,
} from "src/modules/users/common/dto";
import { UserRole } from "src/modules/users-roles/entities";
import { ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";
import { EExtCheckStatus, EManualCheckResult } from "src/modules/backy-check/common/enums";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { EIeltsStatus } from "src/modules/ielts/common/enums";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { Company } from "src/modules/companies/entities";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { checkCompanyOwnerHelper } from "src/modules/companies/common/helpers";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";
import { EExtSumSubReviewAnswer } from "src/modules/sumsub/common/enums";
import { plainToInstance } from "class-transformer";
import { CreateUserProfileOutput, UserProfileOutput } from "src/modules/users/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import {
  COMPANY_ADMIN_ROLES,
  COMPANY_SUPER_ADMIN_ROLES,
  INTERPRETER_ROLES,
  ROLES_CAN_EDIT_NOT_OWN_PROFILES,
  ROLES_CAN_GET_NOT_OWN_PROFILES,
  ROLES_WHICH_CAN_EDIT_USER,
} from "src/common/constants";
import { Address } from "src/modules/addresses/entities";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class UserProfilesService {
  private readonly lokiLogger = new LokiLogger(UserProfilesService.name);
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly userAvatarsService: UserAvatarsService,
    private readonly usersService: UsersService,
    private readonly usersRolesService: UsersRolesService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly helperService: HelperService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
  ) {}

  public async findUserProfile(id: string, dto: GetUserProfileDto): Promise<UserProfileOutput> {
    const user = await this.usersService.getById({
      id,
      relations: {
        userRoles: { user: true, address: true, profile: true, role: true, discountHolder: { promoCampaign: true } },
        avatar: true,
      },
    });
    const currentUserRole = await this.helperService.getUserRoleByName(user, dto.roleName);
    const userProfile: IUserWithRoleIdAndCountry = {
      ...user,
      userRoleId: currentUserRole.id,
      country: currentUserRole.country ?? null,
      userRoleCreationDate: currentUserRole.creationDate,
      userRoleOperatedById: currentUserRole.operatedByCompanyId,
      userRoleOperatedByName: currentUserRole.operatedByCompanyName,
      userRoleIsActive: currentUserRole.isActive,
      currentUserRole: currentUserRole,
    };

    return plainToInstance(UserProfileOutput, userProfile);
  }

  public async createUserProfileInformation(
    id: string,
    dto: CreateUserProfileDto,
    currentUser: ITokenUserData,
  ): Promise<CreateUserProfileOutput> {
    if (ROLES_CAN_GET_NOT_OWN_PROFILES.includes(currentUser.role)) {
      if (currentUser.id !== id && !dto.userRole) {
        throw new BadRequestException("userRole should not be empty.");
      }
    } else if (
      dto.userRole &&
      dto.userRole !== currentUser.role &&
      !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(currentUser.role)
    ) {
      throw new ForbiddenException("Forbidden request.");
    }

    const user = await this.usersService.getById({
      id,
      relations: {
        userRoles: {
          role: true,
          address: true,
          profile: true,
          user: true,
        },
        administratedCompany: true,
      },
    });

    const resolvedRole = dto.userRole ?? currentUser.role;
    const currentUserRole = await this.helperService.getUserRoleByName(user, resolvedRole);

    if (currentUserRole.address?.id || currentUserRole.profile?.id) {
      throw new BadRequestException("Cannot create a user profile because it already exists");
    }

    const savedProfile = await this.constructAndCreateUserProfile(dto.profileInformation);
    const newAddress = this.addressRepository.create(dto.residentialAddress);
    const savedAddress = await this.addressRepository.save(newAddress);

    Object.assign(currentUserRole, {
      address: savedAddress,
      profile: savedProfile,
      country: savedAddress.country ?? null,
      timezone: dto.residentialAddress.timezone,
    });
    const userRole = await this.usersRolesService.upsert(currentUserRole);

    if (user.isDefaultAvatar) {
      await this.userAvatarsService.setDefaultUserAvatar(id, savedProfile.gender);
    }

    if (COMPANY_SUPER_ADMIN_ROLES.includes(currentUser.role)) {
      await this.validateAndUpdateAdminCompany(user);
    }

    const currentUserData: ICurrentUserData = {
      id: user.id,
      role: userRole.role.name,
      userRoleId: userRole.id,
      email: user.email,
      isActive: userRole.isActive,
    };
    await this.activationTrackingService.checkStepsEnded(currentUserData);

    const updatedUser = await this.usersService.getById({
      id,
      relations: {
        userRoles: {
          role: true,
          address: true,
          profile: true,
          user: true,
        },
        administratedCompany: true,
      },
    });

    return { ...updatedUser, userRoles: [userRole] };
  }

  public async constructAndCreateUserProfile(dto: CreateUserProfileInformationDto): Promise<UserProfile> {
    const newUserProfile = this.userProfileRepository.create(dto);
    const savedUserProfile = await this.userProfileRepository.save(newUserProfile);

    return savedUserProfile;
  }

  private async validateAndUpdateAdminCompany(user: User): Promise<void> {
    if (!user.administratedCompany) {
      throw new BadRequestException("Company not exist!");
    }

    await this.companyRepository.update({ id: user.administratedCompany.id }, { status: ECompanyStatus.UNDER_REVIEW });
  }

  public async updateUserProfileInformation(
    id: string,
    dto: UpdateUserProfileDto,
    user: ITokenUserData,
  ): Promise<void> {
    if (id !== user.id && !ROLES_CAN_EDIT_NOT_OWN_PROFILES.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    let userRoleName: EUserRoleName = user.role;

    if (id !== user.id) {
      if (!dto.userRole) {
        throw new BadRequestException("userRole must be not empty!");
      }

      userRoleName = dto.userRole;
    }

    if (id !== user.id && !ROLES_WHICH_CAN_EDIT_USER.includes(user.role)) {
      throw new ForbiddenException("Forbidden request!");
    }

    const userRole = await this.usersRolesService.getByUserIdAndRoleName(id, userRoleName, {
      profile: true,
      address: true,
      naatiProfile: true,
      backyCheck: true,
      abnCheck: true,
      rightToWorkChecks: true,
      ieltsCheck: true,
      languageDocChecks: true,
      user: true,
      role: true,
      userConcessionCard: true,
      sumSubCheck: true,
    });

    this.applyProfileUpdateRestrictions(dto, userRole);

    if (id !== user.id && COMPANY_ADMIN_ROLES.includes(user.role)) {
      await this.validateCompanyAdminAccess(userRole, user);
    }

    if (dto.residentialAddress) {
      await this.addressRepository.update(userRole.address.id, dto.residentialAddress);

      if (dto.residentialAddress.timezone) {
        userRole.timezone = dto.residentialAddress.timezone;
      }
    }

    if (dto.profileInformation) {
      await this.userProfileRepository.save({ ...userRole.profile, ...dto.profileInformation });
    }

    if (dto.profileInformation?.gender && userRole.user.isDefaultAvatar) {
      await this.userAvatarsService.setDefaultUserAvatar(id, dto.profileInformation.gender);
    }

    await this.usersRolesService.upsert(userRole);

    if (userRole.interpreterProfile?.interpreterBadgePdf) {
      this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
      });
    }

    await this.activationTrackingService.checkStepsEnded({
      id: userRole.userId,
      email: userRole.user.email,
      userRoleId: userRole.id,
      role: userRole.role.name,
    });

    return;
  }

  private applyProfileUpdateRestrictions(dto: UpdateUserProfileDto, userRole: UserRole): void {
    if (
      (dto.profileInformation?.firstName || dto.profileInformation?.middleName || dto.profileInformation?.lastName) &&
      (userRole.userConcessionCard?.status === EUserConcessionCardStatus.VERIFIED ||
        userRole.sumSubCheck?.reviewAnswer === EExtSumSubReviewAnswer.GREEN)
    ) {
      throw new BadRequestException(
        "Cannot edit firstName, middleName, or lastName because the user has a verified Concession card or green SumSub status.",
      );
    }

    if (dto.residentialAddress) {
      if (
        (dto.residentialAddress.country || dto.residentialAddress.state || dto.residentialAddress.suburb) &&
        !dto.residentialAddress.timezone
      ) {
        throw new BadRequestException("Timezone must be provided when country or state or suburb is specified.");
      }
    }

    if (
      dto.residentialAddress?.country &&
      INTERPRETER_ROLES.includes(userRole.role.name) &&
      userRole.accountStatus !== EAccountStatus.ACTIVE &&
      userRole.accountStatus !== EAccountStatus.DEACTIVATED
    ) {
      userRole.country = dto.residentialAddress.country;
    }

    if (dto?.profileInformation?.firstName || dto?.profileInformation?.lastName) {
      let isRightToWorkCheckPassed = false;

      if (userRole?.rightToWorkChecks && userRole.rightToWorkChecks?.length > 0) {
        userRole.rightToWorkChecks?.forEach((rightToWorkCheck) => {
          if (rightToWorkCheck.status === ERightToWorkCheckStatus.VERIFIED) {
            isRightToWorkCheckPassed = true;
          }
        });
      }

      if (
        (userRole?.naatiProfile?.certifiedLanguages && userRole?.naatiProfile?.certifiedLanguages?.length > 0) ||
        userRole?.backyCheck?.checkStatus === EExtCheckStatus.READY ||
        userRole?.backyCheck?.manualCheckResults === EManualCheckResult.MANUAL_APPROVED ||
        userRole?.abnCheck?.abnStatus === EExtAbnStatus.ACTIVE ||
        userRole?.ieltsCheck?.status === EIeltsStatus.SUCCESS ||
        userRole?.languageDocChecks?.some((docCheck) => docCheck.status === ELanguageDocCheckRequestStatus.VERIFIED) ||
        isRightToWorkCheckPassed
      ) {
        delete dto?.profileInformation?.firstName;
        delete dto?.profileInformation?.lastName;
      }
    }

    if (
      dto?.profileInformation?.contactEmail &&
      (userRole?.backyCheck?.checkStatus === EExtCheckStatus.OPEN ||
        userRole?.backyCheck?.checkStatus === EExtCheckStatus.IN_PROGRESS ||
        userRole?.backyCheck?.checkStatus === EExtCheckStatus.VERIFIED ||
        userRole?.backyCheck?.checkStatus === EExtCheckStatus.IN_REVIEW)
    ) {
      delete dto?.profileInformation?.contactEmail;
    }
  }

  private async validateCompanyAdminAccess(userRole: UserRole, user: ITokenUserData): Promise<void> {
    const company = await this.companyRepository.findOne({ where: { id: userRole.operatedByCompanyId } });

    if (!company) {
      throw new BadRequestException("Users company not found");
    }

    const admin = await this.userRoleRepository.findOne({
      where: { id: user.userRoleId },
    });

    if (!admin || !admin.operatedByCompanyId) {
      throw new BadRequestException("Admin does not exist or company not set!");
    }

    checkCompanyOwnerHelper(company, user, admin, userRole);
  }
}
