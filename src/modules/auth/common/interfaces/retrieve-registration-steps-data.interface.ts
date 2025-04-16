import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IRetrieveRegistrationStepsData {
  userId: string;
  role: EUserRoleName;
  isOauth: boolean;
  isAdditionalRole: boolean;
  isInvitation: boolean;
}
