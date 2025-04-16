import { IMockAnswer } from "src/modules/mock/common/interfaces";
import { IAbnMessageWithReview } from "src/modules/abn/common/interface";

export interface IMockGetAbnVerificationStatus extends IMockAnswer {
  result: IAbnMessageWithReview;
}
