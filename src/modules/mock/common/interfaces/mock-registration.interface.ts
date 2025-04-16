import { IMockAnswer } from "src/modules/mock/common/interfaces";
import { EmailConfirmationTokenOutput } from "src/modules/auth/common/outputs";

export interface IMockRegistration extends IMockAnswer {
  result: EmailConfirmationTokenOutput | null;
}
