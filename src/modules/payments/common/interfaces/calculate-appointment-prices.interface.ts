import { IDiscountRate } from "src/modules/discounts/common/interfaces";

export interface ICalculateAppointmentPrices {
  amount: number;
  gstAmount: number;
  discountByMembershipMinutes: number;
  discountByMembershipDiscount: number;
  discountByPromoCode: number;
  discounts: IDiscountRate | void;
}
