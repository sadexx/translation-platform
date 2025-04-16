import { ICalculatePrice } from "src/modules/rates/common/interfaces";

export interface IApplyDiscountByMinutes {
  fullAmount: number;
  newPrice: ICalculatePrice;
  appointmentMinutesRemnant: number;
  isGstCalculated: boolean;
}
