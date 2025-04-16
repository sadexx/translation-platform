import { IConvertedRate } from "src/modules/rates/common/interfaces/converted-rate.interface";

export interface IAdditionalBlockRatesForCalculation {
  rateStandardHoursAdditionalBlock: IConvertedRate | null;
  rateAfterHoursAdditionalBlock: IConvertedRate | null;
}
