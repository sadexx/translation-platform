import { ILineData } from "src/modules/statistics/common/interfaces";
import { EChartsHomepageLine } from "src/modules/statistics/common/enums";

export interface IChartHomepageLineData {
  [EChartsHomepageLine.COMPLETED_APPOINTMENTS_ALL]: ILineData;
  [EChartsHomepageLine.COMPLETED_APPOINTMENTS_ON_DEMAND]: ILineData;
  [EChartsHomepageLine.COMPLETED_APPOINTMENTS_PRE_BOOKED]: ILineData;
}
