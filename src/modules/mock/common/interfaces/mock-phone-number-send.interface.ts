import { IMockAnswer } from "src/modules/mock/common/interfaces";
import { MessageOutput } from "src/common/outputs";

export interface IMockPhoneNumberSend extends IMockAnswer {
  result: MessageOutput | null;
}
