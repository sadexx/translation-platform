import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { ECurrencies } from "src/modules/payments/common/enums";

export interface ICreateMembershipPrice {
  region: EMembershipPricingRegion;
  price: number;
  gstRate: number | null;
  currency: ECurrencies;
  stripePriceId: string;
}
