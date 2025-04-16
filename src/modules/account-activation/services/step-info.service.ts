import { Injectable } from "@nestjs/common";
import {
  IAccountRequiredStepsData,
  ICompanyActivationStepsDataInterface,
  ICustomFindOptionsRelations,
} from "src/modules/account-activation/common/interfaces";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { EExtSumSubReviewAnswer } from "src/modules/sumsub/common/enums";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { AbnCheck } from "src/modules/abn/entities";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { DocusignContract } from "src/modules/docusign/entities";
import { EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";
import { EExtCheckStatus, EManualCheckResult } from "src/modules/backy-check/common/enums";
import { CustomInsurance } from "src/modules/interpreter-profile/entities";
import { IeltsCheck } from "src/modules/ielts/entities";
import { EIeltsStatus } from "src/modules/ielts/common/enums";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { UsersRolesService } from "src/modules/users-roles/services";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { NaatiProfile } from "src/modules/naati/entities";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { Company, CompanyDocument } from "src/modules/companies/entities";
import { ECompanyDocumentStatus, ECompanyType } from "src/modules/companies/common/enums";
import { InterpreterQuestionnaire } from "src/modules/interpreter-questionnaire/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { DEFAULT_EMPTY_VALUE } from "src/common/constants";

@Injectable()
export class StepInfoService {
  constructor(private readonly usersRolesService: UsersRolesService) {}

  /**
   ** GET RELATIONS
   **/

  public async getIndPersonalInterpreterRelations(
    userId: string,
    userRoleName: EUserRoleName,
  ): Promise<ICustomFindOptionsRelations> {
    const userCountry = await this.usersRolesService.getCountryByUserIdAndRoleName(userId, userRoleName);

    if (!userCountry) {
      return this.getBaseInterpreterRolesRelations();
    }

    if (AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)) {
      return this.getIndPersonalInterpreterAustralianRelations();
    }

    return this.getIndPersonalInterpreterOtherCountryRelations();
  }

  private getIndPersonalInterpreterAustralianRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        sumSubCheck: true,
        naatiProfile: true,
        interpreterProfile: true,
        customInsurance: true,
        address: true,
        questionnaire: true,
        abnCheck: true,
        backyCheck: true,
        docusignContracts: true,
        profile: true,
        paymentInformation: true,
        role: true,
      },
    };
  }

  private getIndPersonalInterpreterOtherCountryRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        sumSubCheck: true,
        rightToWorkChecks: true,
        questionnaire: true,
        docusignContracts: true,
        address: true,
        profile: true,
        paymentInformation: true,
        role: true,
      },
    };
  }

  public async getIndLanguageBuddyInterpreterRelations(
    userId: string,
    userRoleName: EUserRoleName,
  ): Promise<ICustomFindOptionsRelations> {
    const userCountry = await this.usersRolesService.getCountryByUserIdAndRoleName(userId, userRoleName);

    if (!userCountry) {
      return this.getBaseInterpreterRolesRelations();
    }

    if (AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)) {
      return this.getIndLanguageBuddyInterpreterAustralianRelations();
    }

    return this.getIndLanguageBuddyInterpreterOtherCountryRelations();
  }

  private getIndLanguageBuddyInterpreterAustralianRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        sumSubCheck: true,
        ieltsCheck: true,
        languageDocChecks: true,
        questionnaire: true,
        abnCheck: true,
        interpreterProfile: true,
        docusignContracts: true,
        address: true,
        profile: true,
        paymentInformation: true,
        role: true,
      },
    };
  }

  private getIndLanguageBuddyInterpreterOtherCountryRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        sumSubCheck: true,
        ieltsCheck: true,
        languageDocChecks: true,
        questionnaire: true,
        docusignContracts: true,
        address: true,
        profile: true,
        paymentInformation: true,
        role: true,
      },
    };
  }

  public getIndClientRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        sumSubCheck: true,
        userConcessionCard: true,
        address: true,
        profile: true,
        paymentInformation: true,
        role: true,
      },
    };
  }

  public getBaseInterpreterRolesRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        address: true,
        questionnaire: true,
        profile: true,
      },
    };
  }

  public getOtherRolesRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        address: true,
        profile: true,
      },
    };
  }

  public getCorporateInterpreterRelations(): ICustomFindOptionsRelations {
    return {
      userRoles: {
        rightToWorkChecks: true,
        questionnaire: true,
        address: true,
        profile: true,
      },
    };
  }

  /**
   ** GET STEPS
   **/

  public getIndPersonalInterpreterSteps(userRole: UserRole): IAccountRequiredStepsData {
    if (!userRole.country) {
      return this.getBaseInterpreterRolesSteps(userRole);
    }

    if (!AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userRole.country as EExtCountry)) {
      return this.getIndPersonalInterpreterOtherCountrySteps(userRole);
    }

    return this.getIndPersonalInterpreterAustralianSteps(userRole);
  }

  private getIndPersonalInterpreterAustralianSteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      sumSubVerificationFulfilled: {
        index: 1,
        status: this.mapSumSubVerificationStatus(userRole.sumSubCheck),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(userRole.role.name, userRole.paymentInformation),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      naatiVerificationFulfilled: {
        index: 3,
        status: this.mapNaatiVerificationStatus(userRole.naatiProfile),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      questionnaireFulfilled: {
        index: 4,
        status: this.mapQuestionnaireStatus(userRole.questionnaire),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      abnVerificationFulfilled: {
        index: 5,
        status: this.mapAbnVerificationStatus(userRole.abnCheck),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      backyCheckFulfilled: {
        index: 6,
        status: this.mapBackyCheckStatus(userRole.backyCheck),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      customInsuranceFulfilled: {
        index: 7,
        status: this.mapCustomInsuranceStatus(userRole.customInsurance),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      docusignContractFulfilled: {
        index: 8,
        status: this.mapDocusignContractStatus(userRole.docusignContracts),
        canSkip: true,
        isBlockAccountActivation: true,
      },
    };
  }

  private getIndPersonalInterpreterOtherCountrySteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      sumSubVerificationFulfilled: {
        index: 1,
        status: this.mapSumSubVerificationStatus(userRole.sumSubCheck),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(userRole.role.name, userRole.paymentInformation),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      rightToWorkCheckFulfilled: {
        index: 3,
        status: this.mapRightToWorkCheckStatus(userRole.rightToWorkChecks),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      questionnaireFulfilled: {
        index: 4,
        status: this.mapQuestionnaireStatus(userRole.questionnaire),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      docusignContractFulfilled: {
        index: 5,
        status: this.mapDocusignContractStatus(userRole.docusignContracts),
        canSkip: true,
        isBlockAccountActivation: true,
      },
    };
  }

  public getIndLanguageBuddyInterpreterSteps(userRole: UserRole): IAccountRequiredStepsData {
    if (!userRole.country) {
      return this.getBaseInterpreterRolesSteps(userRole);
    }

    if (!AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userRole.country as EExtCountry)) {
      return this.getIndLanguageBuddyInterpreterOtherCountrySteps(userRole);
    }

    return this.getIndLanguageBuddyInterpreterAustralianSteps(userRole);
  }

  private getIndLanguageBuddyInterpreterAustralianSteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      sumSubVerificationFulfilled: {
        index: 1,
        status: this.mapSumSubVerificationStatus(userRole.sumSubCheck),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(userRole.role.name, userRole.paymentInformation),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      rightToWorkAsLanguageBuddy: {
        index: 3,
        status: this.mapRightToWorkAsLanguageBuddyCheckStatus(userRole),
        canSkip: true,
        isBlockAccountActivation: true,
        ieltsCheckFulfilled: {
          status: this.mapIeltsCheckStatus(userRole.ieltsCheck),
        },
        languageDocCheckFulfilled: {
          status: this.mapLanguageDocCheckStatus(userRole.languageDocChecks),
        },
      },
      questionnaireFulfilled: {
        index: 4,
        status: this.mapQuestionnaireStatus(userRole.questionnaire),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      abnVerificationFulfilled: {
        index: 5,
        status: this.mapAbnVerificationStatus(userRole.abnCheck),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      docusignContractFulfilled: {
        index: 6,
        status: this.mapDocusignContractStatus(userRole.docusignContracts),
        canSkip: true,
        isBlockAccountActivation: true,
      },
    };
  }

  private getIndLanguageBuddyInterpreterOtherCountrySteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      sumSubVerificationFulfilled: {
        index: 1,
        status: this.mapSumSubVerificationStatus(userRole.sumSubCheck),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(userRole.role.name, userRole.paymentInformation),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      rightToWorkAsLanguageBuddy: {
        index: 3,
        status: this.mapRightToWorkAsLanguageBuddyCheckStatus(userRole),
        canSkip: true,
        isBlockAccountActivation: true,
        ieltsCheckFulfilled: {
          status: this.mapIeltsCheckStatus(userRole.ieltsCheck),
        },
        languageDocCheckFulfilled: {
          status: this.mapLanguageDocCheckStatus(userRole.languageDocChecks),
        },
      },
      questionnaireFulfilled: {
        index: 4,
        status: this.mapQuestionnaireStatus(userRole.questionnaire),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      docusignContractFulfilled: {
        index: 5,
        status: this.mapDocusignContractStatus(userRole.docusignContracts),
        canSkip: true,
        isBlockAccountActivation: true,
      },
    };
  }

  public getIndClientSteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      sumSubVerificationFulfilled: {
        index: 1,
        status: this.mapSumSubVerificationStatus(userRole.sumSubCheck),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(userRole.role.name, userRole.paymentInformation),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      concessionCardFulfilled: {
        index: 3,
        status: this.mapConcessionCardStatus(userRole.userConcessionCard),
        canSkip: true,
        isBlockAccountActivation: false,
      },
    };
  }

  public getBaseInterpreterRolesSteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      questionnaireFulfilled: {
        index: 1,
        status: this.mapQuestionnaireStatus(userRole.questionnaire),
        canSkip: false,
        isBlockAccountActivation: true,
      },
    };
  }

  public getOtherRolesSteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
    };
  }

  public getCorporateInterpreterSteps(userRole: UserRole): IAccountRequiredStepsData {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapProfileInformationStatus(userRole),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      rightToWorkCheckFulfilled: {
        index: 1,
        status: this.mapRightToWorkCheckStatus(userRole.rightToWorkChecks),
        canSkip: true,
        isBlockAccountActivation: true,
      },
      questionnaireFulfilled: {
        index: 2,
        status: this.mapQuestionnaireStatus(userRole.questionnaire),
        canSkip: false,
        isBlockAccountActivation: true,
      },
    };
  }

  public getCorporateSteps(company: Company): ICompanyActivationStepsDataInterface {
    if (!company?.country) {
      return this.getCorporateOtherCountrySteps(company);
    }

    if (!AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(company.country)) {
      return this.getCorporateOtherCountrySteps(company);
    }

    return this.getCorporateAustralianSteps(company);
  }

  public getCorporateInterpretingProviderCorporateClientsSteps(company: Company): ICompanyActivationStepsDataInterface {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapCompanyProfileInformationStatus(company),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      documentsFulfilled: {
        index: 1,
        status: this.mapCompanyDocumentsStatus(company?.documents),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(
          DEFAULT_EMPTY_VALUE,
          company?.paymentInformation,
          company?.companyType,
        ),
        canSkip: false,
        isBlockAccountActivation: true,
      },
    };
  }

  private getCorporateAustralianSteps(company: Company): ICompanyActivationStepsDataInterface {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapCompanyProfileInformationStatus(company),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      abnVerificationFulfilled: {
        index: 1,
        status: this.mapAbnVerificationStatus(company?.abnCheck),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      documentsFulfilled: {
        index: 2,
        status: this.mapCompanyDocumentsStatus(company?.documents),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      paymentInformationFulfilled: {
        index: 3,
        status: this.mapPaymentInformationStatus(
          DEFAULT_EMPTY_VALUE,
          company?.paymentInformation,
          company?.companyType,
        ),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      docusignContractFulfilled: {
        index: 4,
        status: this.mapDocusignContractCorporateStatus(company?.contract),
        canSkip: false,
        isBlockAccountActivation: true,
      },
    };
  }

  private getCorporateOtherCountrySteps(company: Company): ICompanyActivationStepsDataInterface {
    return {
      profileInformationFulfilled: {
        index: 0,
        status: this.mapCompanyProfileInformationStatus(company),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      documentsFulfilled: {
        index: 1,
        status: this.mapCompanyDocumentsStatus(company?.documents),
        canSkip: true,
        isBlockAccountActivation: false,
      },
      paymentInformationFulfilled: {
        index: 2,
        status: this.mapPaymentInformationStatus(
          DEFAULT_EMPTY_VALUE,
          company?.paymentInformation,
          company?.companyType,
        ),
        canSkip: false,
        isBlockAccountActivation: true,
      },
      docusignContractFulfilled: {
        index: 3,
        status: this.mapDocusignContractCorporateStatus(company?.contract),
        canSkip: false,
        isBlockAccountActivation: true,
      },
    };
  }

  /**
   ** MAP STEP STATUS
   **/

  private mapProfileInformationStatus(userRole: UserRole): EStepStatus {
    let status = EStepStatus.NOT_STARTED;

    if (userRole.address?.id || userRole.profile?.id || userRole.profile?.contactEmail) {
      status = EStepStatus.INITIAL;
    }

    if (userRole.address?.id && userRole.profile?.id && userRole.profile?.contactEmail) {
      status = EStepStatus.SUCCESS;
    }

    return status;
  }

  private mapQuestionnaireStatus(questionnaire?: InterpreterQuestionnaire): EStepStatus {
    if (questionnaire) {
      return EStepStatus.SUCCESS;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapSumSubVerificationStatus(sumSubCheck?: SumSubCheck): EStepStatus {
    if (sumSubCheck?.reviewAnswer === EExtSumSubReviewAnswer.GREEN) {
      return EStepStatus.SUCCESS;
    }

    if (sumSubCheck?.reviewAnswer === EExtSumSubReviewAnswer.RED) {
      return EStepStatus.FAILED;
    }

    if (sumSubCheck) {
      return EStepStatus.PENDING;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapAbnVerificationStatus(abnCheck?: AbnCheck): EStepStatus {
    if (!abnCheck) {
      return EStepStatus.NOT_STARTED;
    }

    if (abnCheck?.abnStatus === EExtAbnStatus.ACTIVE) {
      return EStepStatus.SUCCESS;
    }

    if (abnCheck?.abnStatus === EExtAbnStatus.CANCELLED || !abnCheck?.abnStatus) {
      return EStepStatus.FAILED;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapDocusignContractStatus(docusignContracts?: DocusignContract[]): EStepStatus {
    let status = EStepStatus.NOT_STARTED;

    if (docusignContracts && docusignContracts.length > 0) {
      status = EStepStatus.INITIAL;

      docusignContracts.forEach((contract) => {
        if (contract.docusignStatus === EExtDocusignStatus.COMPLETED) {
          status = EStepStatus.SUCCESS;
        }
      });
    }

    return status;
  }

  private mapBackyCheckStatus(backyCheck?: BackyCheck): EStepStatus {
    if (!backyCheck) {
      return EStepStatus.NOT_STARTED;
    }

    if (
      backyCheck?.checkStatus === EExtCheckStatus.READY ||
      backyCheck?.manualCheckResults === EManualCheckResult.MANUAL_APPROVED
    ) {
      return EStepStatus.SUCCESS;
    }

    if (
      backyCheck?.checkStatus === EExtCheckStatus.CANCELLED ||
      backyCheck?.manualCheckResults === EManualCheckResult.MANUAL_REJECTED
    ) {
      return EStepStatus.FAILED;
    }

    if (
      backyCheck?.checkStatus === EExtCheckStatus.IN_PROGRESS ||
      backyCheck?.checkStatus === EExtCheckStatus.VERIFIED ||
      backyCheck?.checkStatus === EExtCheckStatus.IN_REVIEW ||
      backyCheck?.manualCheckResults === EManualCheckResult.PENDING
    ) {
      return EStepStatus.PENDING;
    }

    return EStepStatus.INITIAL;
  }

  private mapNaatiVerificationStatus(naatiProfile?: NaatiProfile): EStepStatus {
    if (!naatiProfile) {
      return EStepStatus.NOT_STARTED;
    }

    if (!naatiProfile?.certifiedLanguages || naatiProfile?.certifiedLanguages?.length === 0) {
      return EStepStatus.FAILED;
    }

    if (naatiProfile?.certifiedLanguages && naatiProfile?.certifiedLanguages?.length > 0) {
      return EStepStatus.SUCCESS;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapRightToWorkAsLanguageBuddyCheckStatus(userRole: UserRole): EStepStatus {
    const ieltsStatus = this.mapIeltsCheckStatus(userRole.ieltsCheck);
    const languageDockCheckStatus = this.mapLanguageDocCheckStatus(userRole.languageDocChecks);

    let status = ieltsStatus;

    if (languageDockCheckStatus !== EStepStatus.NOT_STARTED && languageDockCheckStatus !== EStepStatus.FAILED) {
      status = languageDockCheckStatus;
    }

    if (ieltsStatus === EStepStatus.FAILED && languageDockCheckStatus === EStepStatus.NOT_STARTED) {
      status = EStepStatus.NOT_STARTED;
    }

    return status;
  }

  private mapIeltsCheckStatus(ieltsCheck?: IeltsCheck): EStepStatus {
    if (ieltsCheck?.status === EIeltsStatus.SUCCESS) {
      return EStepStatus.SUCCESS;
    }

    if (ieltsCheck?.status === EIeltsStatus.FAIL) {
      return EStepStatus.FAILED;
    }

    if (ieltsCheck) {
      return EStepStatus.INITIAL;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapLanguageDocCheckStatus(languageDocChecks?: LanguageDocCheck[]): EStepStatus {
    if (!languageDocChecks || languageDocChecks.length === 0) {
      return EStepStatus.NOT_STARTED;
    }

    if (languageDocChecks.some((doc) => doc.status === ELanguageDocCheckRequestStatus.VERIFIED)) {
      return EStepStatus.SUCCESS;
    }

    if (languageDocChecks.some((doc) => doc.status === ELanguageDocCheckRequestStatus.PENDING)) {
      return EStepStatus.PENDING;
    }

    if (languageDocChecks.some((doc) => doc.status === ELanguageDocCheckRequestStatus.INITIALIZED)) {
      return EStepStatus.INITIAL;
    }

    if (languageDocChecks.some((doc) => doc.status === ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS)) {
      return EStepStatus.FAILED;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapCustomInsuranceStatus(customInsurance?: CustomInsurance): EStepStatus {
    if (customInsurance?.insuredParty && customInsurance?.insuranceCompany && customInsurance?.policyNumber) {
      return EStepStatus.SUCCESS;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapConcessionCardStatus(userConcessionCard?: UserConcessionCard): EStepStatus {
    if (userConcessionCard?.status === EUserConcessionCardStatus.INITIALIZED) {
      return EStepStatus.INITIAL;
    }

    if (userConcessionCard?.status === EUserConcessionCardStatus.PENDING) {
      return EStepStatus.PENDING;
    }

    if (userConcessionCard?.status === EUserConcessionCardStatus.VERIFIED) {
      return EStepStatus.SUCCESS;
    }

    if (userConcessionCard?.status === EUserConcessionCardStatus.DOCUMENT_VERIFICATION_FAILS) {
      return EStepStatus.FAILED;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapRightToWorkCheckStatus(rightToWorkChecks?: RightToWorkCheck[]): EStepStatus {
    let status = EStepStatus.NOT_STARTED;

    if (rightToWorkChecks && rightToWorkChecks.length > 0) {
      rightToWorkChecks.forEach((rightToWorkCheck) => {
        if (rightToWorkCheck.status === ERightToWorkCheckStatus.VERIFIED) {
          status = EStepStatus.SUCCESS;
        }

        if (rightToWorkCheck.status === ERightToWorkCheckStatus.PENDING && status !== EStepStatus.SUCCESS) {
          status = EStepStatus.PENDING;
        }

        if (
          rightToWorkCheck.status === ERightToWorkCheckStatus.INITIALIZED &&
          status !== EStepStatus.SUCCESS &&
          status !== EStepStatus.PENDING
        ) {
          status = EStepStatus.INITIAL;
        }

        if (
          rightToWorkCheck.status === ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
          status !== EStepStatus.SUCCESS &&
          status !== EStepStatus.PENDING &&
          status !== EStepStatus.INITIAL
        ) {
          status = EStepStatus.FAILED;
        }
      });
    }

    return status;
  }

  private mapPaymentInformationStatus(
    userRoleName?: EUserRoleName,
    paymentInformation?: PaymentInformation,
    companyType?: ECompanyType,
  ): EStepStatus {
    if (userRoleName && userRoleName === EUserRoleName.IND_CLIENT) {
      if (
        paymentInformation &&
        paymentInformation.stripeClientPaymentMethodId &&
        paymentInformation.stripeClientAccountId &&
        paymentInformation.stripeClientLastFour
      ) {
        return EStepStatus.SUCCESS;
      }

      return EStepStatus.NOT_STARTED;
    }

    if (
      userRoleName &&
      (userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER ||
        userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER)
    ) {
      if (paymentInformation) {
        if (paymentInformation.paypalPayerId) {
          return EStepStatus.SUCCESS;
        }

        if (paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS) {
          return EStepStatus.SUCCESS;
        }

        if (paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.DOCUMENTS_PENDING) {
          return EStepStatus.PENDING;
        }

        if (
          paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ACCOUNT_CREATED ||
          paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_STARTED ||
          paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.NEED_DOCUMENTS
        ) {
          return EStepStatus.INITIAL;
        }

        if (paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.INCORRECT_COUNTRY) {
          return EStepStatus.FAILED;
        }
      }

      return EStepStatus.NOT_STARTED;
    }

    if (companyType && companyType === ECompanyType.CORPORATE_CLIENTS) {
      if (
        paymentInformation &&
        paymentInformation.stripeClientPaymentMethodId &&
        paymentInformation.stripeClientAccountId &&
        paymentInformation.stripeClientLastFour
      ) {
        return EStepStatus.SUCCESS;
      }

      return EStepStatus.NOT_STARTED;
    }

    if (companyType && companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
      let status = EStepStatus.NOT_STARTED;

      if (
        paymentInformation &&
        ((paymentInformation.stripeClientPaymentMethodId &&
          paymentInformation.stripeClientAccountId &&
          paymentInformation.stripeClientLastFour) ||
          paymentInformation.paypalPayerId ||
          paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS)
      ) {
        status = EStepStatus.INITIAL;
      }

      if (
        paymentInformation &&
        paymentInformation.stripeClientPaymentMethodId &&
        paymentInformation.stripeClientAccountId &&
        paymentInformation.stripeClientLastFour &&
        (paymentInformation.paypalPayerId ||
          paymentInformation.stripeInterpreterOnboardingStatus === EOnboardingStatus.ONBOARDING_SUCCESS)
      ) {
        status = EStepStatus.SUCCESS;
      }

      return status;
    }

    return EStepStatus.NOT_STARTED;
  }

  private mapCompanyProfileInformationStatus(company: Company): EStepStatus {
    let status: EStepStatus = EStepStatus.NOT_STARTED;

    if (company.address && company.name) {
      status = EStepStatus.SUCCESS;

      if (
        company.superAdmin.userRoles[0].role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
        !company.activitySphere
      ) {
        status = EStepStatus.NOT_STARTED;
      }

      if (
        !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(company.country) &&
        !company.businessRegistrationNumber
      ) {
        status = EStepStatus.NOT_STARTED;
      }
    }

    return status;
  }

  private mapCompanyDocumentsStatus(companyDocuments: CompanyDocument[]): EStepStatus {
    let status = EStepStatus.NOT_STARTED;

    if (companyDocuments && companyDocuments.length > 0) {
      status = EStepStatus.SUCCESS;

      companyDocuments.forEach((companyDocument) => {
        if (companyDocument.status !== ECompanyDocumentStatus.VERIFIED) {
          status = EStepStatus.PENDING;
        }
      });
    }

    return status;
  }

  private mapDocusignContractCorporateStatus(docusignContract?: DocusignContract): EStepStatus {
    if (!docusignContract) {
      return EStepStatus.NOT_STARTED;
    }

    if (docusignContract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      return EStepStatus.SUCCESS;
    }

    return EStepStatus.INITIAL;
  }
}
