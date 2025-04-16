import { IConvertedRate } from "src/modules/rates/common/interfaces/converted-rate.interface";

export interface IRatesForCalculation {
  rateStandardHoursFirstMinutes: IConvertedRate;
  rateStandardHoursAdditionalBlock: IConvertedRate | null;
  rateAfterHoursFirstMinutes: IConvertedRate | null;
  rateAfterHoursAdditionalBlock: IConvertedRate | null;
}
