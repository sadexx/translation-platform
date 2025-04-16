import { IMockAnswer } from "src/modules/mock/common/interfaces";
import { INaatiApiResponse } from "src/modules/naati/common/interface";

export interface IMockVerificationNaatiCpnNumber extends IMockAnswer {
  result: INaatiApiResponse;
}
