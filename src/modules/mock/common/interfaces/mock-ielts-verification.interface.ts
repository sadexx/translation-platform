import { IMockAnswer } from "src/modules/mock/common/interfaces";
import { IResultVerification } from "src/modules/ielts/common/interfaces";

export interface IMockIeltsVerification extends IMockAnswer {
  result: IResultVerification;
}
