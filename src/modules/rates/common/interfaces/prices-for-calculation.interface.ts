export interface IPricesForCalculation {
  basePriceStandardHours: number | null;
  additionalPriceStandardHours: number | null | undefined;
  basePriceAfterHours: number | null | undefined;
  additionalPriceAfterHours: number | null | undefined;
}
