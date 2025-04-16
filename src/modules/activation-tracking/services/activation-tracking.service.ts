import { BadRequestException, Injectable } from "@nestjs/common";
import { AccountActivationService } from "src/modules/account-activation/services";
import { DocusignService } from "src/modules/docusign/services";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { MockService } from "src/modules/mock/services";
import { ConfigService } from "@nestjs/config";
import { IStepInformation } from "src/modules/account-activation/common/interfaces";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { ROLES_FOR_AUTOMATICALLY_ACCOUNT_ACTIVATION } from "src/modules/activation-tracking/common/constants/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class ActivationTrackingService {
  private readonly lokiLogger = new LokiLogger(ActivationTrackingService.name);

  public constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accountActivationService: AccountActivationService,
    private readonly docusignService: DocusignService,
    private readonly mockService: MockService,
    private readonly configService: ConfigService,
  ) {}

  public async checkStepsEnded(user: ICurrentUserData): Promise<void> {
    try {
      if (user.isActive) {
        throw new BadRequestException("User already activated");
      }

      if (!user.id || !user.role) {
        throw new BadRequestException("User not found");
      }

      if (!ROLES_FOR_AUTOMATICALLY_ACCOUNT_ACTIVATION.includes(user.role)) {
        return;
      }

      const neededSteps = await this.accountActivationService.retrieveRequiredAndActivationSteps(user);
      const isNeedContract = !!neededSteps?.docusignContractFulfilled;
      const isContractStarted = neededSteps?.docusignContractFulfilled?.status !== EStepStatus.NOT_STARTED;
      let isSomeStepsNotEnded = false;

      delete neededSteps.docusignContractFulfilled;

      Object.keys(neededSteps).forEach((stepName) => {
        const step = (neededSteps as unknown as Record<string, IStepInformation>)[stepName];

        if (step.isBlockAccountActivation) {
          if (step.status !== EStepStatus.SUCCESS) {
            isSomeStepsNotEnded = true;
          }
        }
      });

      if (isSomeStepsNotEnded) {
        return;
      }

      const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

      const userInfo = await this.userRepository.findOne({
        where: { id: user.id, userRoles: { role: { name: user.role } } },
      });

      if (!userInfo) {
        throw new BadRequestException("User not found!");
      }

      if (isNeedContract && !isContractStarted) {
        if (mockEnabled) {
          if (this.mockService.mockEmails.includes(userInfo.email)) {
            await this.mockService.mockCreateAndSendContract(user as ITokenUserData);
            await this.checkStepsEnded(user);
          }

          if (!this.mockService.mockEmails.includes(userInfo.email)) {
            await this.docusignService.createAndSendContract(user as ITokenUserData);
          }
        }

        if (!mockEnabled) {
          await this.docusignService.createAndSendContract(user as ITokenUserData);
        }

        return;
      }

      if ((isNeedContract && isContractStarted) || !isNeedContract) {
        const activationResult = await this.accountActivationService.activateAccount(user);

        if (activationResult?.failedActivationCriteria) {
          this.lokiLogger.error(activationResult.failedActivationCriteria);
        }

        return;
      }
    } catch (error) {
      this.lokiLogger.error(`Error while checking steps for user: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
