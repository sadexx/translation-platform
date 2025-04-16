import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { UsersRolesService } from "src/modules/users-roles/services";
import { User } from "src/modules/users/entities";
import {
  IAccountRequiredStepsData,
  ICustomFindOptionsRelations,
  IStepInformation,
} from "src/modules/account-activation/common/interfaces";
import {
  FinishAccountActivationStepsOutput,
  FinishCompanyActivationStepsOutput,
} from "src/modules/account-activation/common/outputs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SessionsService } from "src/modules/sessions/services";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { StepInfoService } from "src/modules/account-activation/services";
import { UserRole } from "src/modules/users-roles/entities";
import { OneRoleLoginOutput } from "src/modules/auth/common/outputs";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { NotificationService } from "src/modules/notifications/services";
import { Company } from "src/modules/companies/entities";
import { checkCompanyOwnerHelper } from "src/modules/companies/common/helpers";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { COMPANY_ADMIN_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class AccountActivationService {
  private readonly lokiLogger = new LokiLogger(AccountActivationService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly usersRolesService: UsersRolesService,
    private readonly sessionsService: SessionsService,
    private readonly stepInfoService: StepInfoService,
    private readonly notificationService: NotificationService,
  ) {}

  public async retrieveRequiredAndActivationSteps(
    user: ITokenUserData | ICurrentUserData,
  ): Promise<IAccountRequiredStepsData> {
    if (!user.id || !user.role) {
      throw new BadRequestException("User not found");
    }

    const { accountActivationSteps } = await this.fetchUserAndEvaluateRequiredAndActivationSteps(user.id, user.role);

    return accountActivationSteps;
  }

  public async activateAccount(currentClient: ICurrentUserData): Promise<FinishAccountActivationStepsOutput> {
    if (!currentClient.id || !currentClient.role) {
      throw new BadRequestException("User not found");
    }

    const { user, userRole, accountActivationSteps } = await this.fetchUserAndEvaluateRequiredAndActivationSteps(
      currentClient.id,
      currentClient.role,
    );

    if (userRole.isRequiredInfoFulfilled && userRole.isActive) {
      throw new BadRequestException("Your account is already active");
    }

    const checkActivationCriteriaResult = this.checkActivationCriteria(accountActivationSteps);

    if (checkActivationCriteriaResult.failed.length > 0) {
      this.throwRequiredInfoException(checkActivationCriteriaResult);
    }

    userRole.isRequiredInfoFulfilled = checkActivationCriteriaResult.passed.length > 0;

    let failedActivationCriteria: string | null = null;

    if (checkActivationCriteriaResult.failed.length === 0) {
      userRole.isActive = true;
      userRole.accountStatus = EAccountStatus.ACTIVE;
      userRole.lastDeactivationDate = null;
    } else {
      failedActivationCriteria = `Your account in inactive. Missed activation steps: ${checkActivationCriteriaResult.failed.join(
        ", ",
      )}`;
    }

    await this.usersRolesService.upsert(userRole);

    const tokens = await this.startSession(user, currentClient, userRole);

    if (userRole.accountStatus === EAccountStatus.ACTIVE) {
      this.notificationService.sendAccountActivationNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send account activation notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    }

    return failedActivationCriteria ? { ...tokens, failedActivationCriteria } : tokens;
  }

  public async fetchUserAndEvaluateRequiredAndActivationSteps(
    userId: string,
    userRoleName: EUserRoleName,
  ): Promise<{
    user: User;
    userRole: UserRole;
    accountActivationSteps: IAccountRequiredStepsData;
  }> {
    const relations = await this.getRelations(userId, userRoleName);

    const user = await this.userRepository.findOne({
      where: { userRoles: { userId, role: { name: userRoleName }, address: true, profile: true } },
      relations: { userRoles: { role: true }, ...relations },
    });

    if (!user) {
      throw new ForbiddenException("User with such id and role doesn't exist");
    }

    const userRole = user.userRoles[0];

    const accountActivationSteps: IAccountRequiredStepsData = this.getSteps(userRole, userRoleName);

    return { user, userRole, accountActivationSteps };
  }

  public async activateByAdmin(userRoleId: string, user: ITokenUserData): Promise<FinishCompanyActivationStepsOutput> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id: userRoleId },
      relations: { role: true, user: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role with this id doesn`t exist");
    }

    if (userRole.isActive) {
      throw new BadRequestException("This user role is already active");
    }

    if (COMPANY_ADMIN_ROLES.includes(user.role)) {
      const admin = await this.userRoleRepository.findOne({
        where: { userId: user.id, role: { name: user.role } },
      });

      if (!admin || !admin.operatedByCompanyId) {
        throw new BadRequestException("Admin does not exist or company not set!");
      }

      const company = await this.companyRepository.findOne({ where: { id: userRole.operatedByCompanyId } });

      if (!company) {
        throw new BadRequestException("Administrated company for this user not exist!");
      }

      checkCompanyOwnerHelper(company, user, admin, userRole);
    }

    const { failedActivationCriteria } = await this.activateAccount({
      role: userRole.role.name,
      email: userRole.user.email,
      userRoleId: userRole.id,
      id: userRole.userId,
    });

    return { failedActivationCriteria: failedActivationCriteria ? failedActivationCriteria : null };
  }

  public async deactivate(userRoleId: string, user: ITokenUserData): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id: userRoleId },
    });

    if (!userRole) {
      throw new NotFoundException("User role with this id doesn`t exist");
    }

    if (!userRole.isActive) {
      throw new BadRequestException("This user role is not active");
    }

    if (COMPANY_ADMIN_ROLES.includes(user.role)) {
      const admin = await this.userRoleRepository.findOne({
        where: { userId: user.id, role: { name: user.role } },
      });

      if (!admin || !admin.operatedByCompanyId) {
        throw new BadRequestException("Admin does not exist or company not set!");
      }

      const company = await this.companyRepository.findOne({ where: { id: userRole.operatedByCompanyId } });

      if (!company) {
        throw new BadRequestException("Administrated company for this user not exist!");
      }

      checkCompanyOwnerHelper(company, user, admin, userRole);
    }

    await this.userRoleRepository.update(
      { id: userRole.id },
      { isActive: false, accountStatus: EAccountStatus.DEACTIVATED, lastDeactivationDate: new Date() },
    );

    this.notificationService.sendAccountDeactivationNotification(userRole.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to send account deactivation notification for userRoleId: ${userRole.id}`,
        error.stack,
      );
    });

    return;
  }

  private throwRequiredInfoException(criteria: { passed: string[]; failed: string[] }): void {
    let message = `Required information wasn't provided.`;

    if (criteria.passed.length > 0) {
      message += ` Passed steps: ${criteria.passed.join(", ")}.`;
    }

    message += ` Missed steps: ${criteria.failed.join(", ")}`;
    throw new ForbiddenException(message);
  }

  private async startSession(
    user: User,
    currentClient: ICurrentUserData,
    userRole: UserRole,
  ): Promise<OneRoleLoginOutput> {
    if (
      !currentClient.clientUserAgent ||
      !currentClient.clientIPAddress ||
      !currentClient.platform ||
      !currentClient.deviceId ||
      !currentClient.deviceToken ||
      !currentClient.iosVoipToken
    ) {
      const lastSession = await this.sessionsService.getLast(user.id);

      if (!lastSession) {
        throw new ServiceUnavailableException("Last session does not exist, re-login, please");
      }

      currentClient.platform = lastSession.platform;
      currentClient.deviceId = lastSession.deviceId;
      currentClient.deviceToken = lastSession.deviceToken;
      currentClient.iosVoipToken = lastSession.iosVoipToken;
      currentClient.clientUserAgent = lastSession.clientUserAgent;
      currentClient.clientIPAddress = lastSession.clientIPAddress;
    }

    if (!currentClient.clientIPAddress || !currentClient.clientUserAgent) {
      throw new BadRequestException("Client IP address and user agent are required");
    }

    if (!currentClient.platform || !currentClient.deviceId) {
      throw new BadRequestException("Client platform, device id and device token are required");
    }

    return await this.sessionsService.updateActiveSession({
      userId: user.id,
      userRoleId: userRole.id,
      userRole: currentClient.role,
      platform: currentClient.platform,
      deviceId: currentClient.deviceId,
      deviceToken: currentClient.deviceToken,
      iosVoipToken: currentClient.iosVoipToken,
      clientUserAgent: currentClient.clientUserAgent,
      clientIPAddress: currentClient.clientIPAddress,
      isUpdateFirstStageToken: true,
    });
  }

  private checkActivationCriteria(accountActivationSteps: IAccountRequiredStepsData): {
    passed: string[];
    failed: string[];
  } {
    const passed: string[] = [];
    const failed: string[] = [];

    Object.keys(accountActivationSteps).forEach((stepName) => {
      const step = (accountActivationSteps as unknown as Record<string, IStepInformation>)[stepName];

      if (step.isBlockAccountActivation) {
        if (step.status === EStepStatus.SUCCESS) {
          passed.push(stepName);
        }

        if (step.status !== EStepStatus.SUCCESS) {
          failed.push(stepName);
        }
      }
    });

    return { passed, failed };
  }

  private async getRelations(userId: string, userRoleName: EUserRoleName): Promise<ICustomFindOptionsRelations> {
    if (userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER) {
      return await this.stepInfoService.getIndLanguageBuddyInterpreterRelations(userId, userRoleName);
    }

    if (userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER) {
      return await this.stepInfoService.getIndPersonalInterpreterRelations(userId, userRoleName);
    }

    if (userRoleName === EUserRoleName.IND_CLIENT) {
      return this.stepInfoService.getIndClientRelations();
    }

    if (userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      return this.stepInfoService.getCorporateInterpreterRelations();
    }

    return this.stepInfoService.getOtherRolesRelations();
  }

  private getSteps(userRole: UserRole, userRoleName: EUserRoleName): IAccountRequiredStepsData {
    if (userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER) {
      return this.stepInfoService.getIndLanguageBuddyInterpreterSteps(userRole);
    }

    if (userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER) {
      return this.stepInfoService.getIndPersonalInterpreterSteps(userRole);
    }

    if (userRoleName === EUserRoleName.IND_CLIENT) {
      return this.stepInfoService.getIndClientSteps(userRole);
    }

    if (userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      return this.stepInfoService.getCorporateInterpreterSteps(userRole);
    }

    return this.stepInfoService.getOtherRolesSteps(userRole);
  }
}
