import { IStepInformation } from "src/modules/account-activation/common/interfaces";

export interface ICompanyActivationStepsDataInterface {
  profileInformationFulfilled: IStepInformation;
  abnVerificationFulfilled?: IStepInformation;
  documentsFulfilled: IStepInformation;
  paymentInformationFulfilled: IStepInformation;
  docusignContractFulfilled?: IStepInformation;
}
