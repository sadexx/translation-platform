import { IMockAnswer } from "src/modules/mock/common/interfaces";
import { IStartWwccRes } from "src/modules/backy-check/common/interfaces";

export interface IMockStartWWCC extends IMockAnswer {
  result: IStartWwccRes;
}
