import { ConfigService } from "@nestjs/config";
import { EMembershipPricingRegion, EMembershipStatus, EMembershipType } from "src/modules/memberships/common/enums";
import { ECurrencies } from "src/modules/payments/common/enums";
import { ICreateMembership } from "src/modules/memberships/common/interfaces";

export const membershipsSeedData = (configService: ConfigService): ICreateMembership[] => [
  {
    type: EMembershipType.BRONZE,
    status: EMembershipStatus.ACTIVE,
    discount: 5,
    onDemandMinutes: 15,
    preBookedMinutes: 15,
    isMostPopular: false,
    membershipPrices: [
      {
        region: EMembershipPricingRegion.GLOBAL,
        price: 99,
        gstRate: null,
        currency: ECurrencies.USD,
        stripePriceId: configService.getOrThrow<string>("STRIPE_PRICE_ID_BRONZE_GLOBAL"),
      },
      {
        region: EMembershipPricingRegion.AU,
        price: 109,
        gstRate: 10,
        currency: ECurrencies.AUD,
        stripePriceId: configService.getOrThrow<string>("STRIPE_PRICE_ID_BRONZE_AU"),
      },
    ],
  },
  {
    type: EMembershipType.SILVER,
    status: EMembershipStatus.ACTIVE,
    discount: 10,
    onDemandMinutes: 15,
    preBookedMinutes: 45,
    isMostPopular: true,
    membershipPrices: [
      {
        region: EMembershipPricingRegion.GLOBAL,
        price: 189,
        gstRate: null,
        currency: ECurrencies.USD,
        stripePriceId: configService.getOrThrow<string>("STRIPE_PRICE_ID_SILVER_GLOBAL"),
      },
      {
        region: EMembershipPricingRegion.AU,
        price: 208,
        gstRate: 10,
        currency: ECurrencies.AUD,
        stripePriceId: configService.getOrThrow<string>("STRIPE_PRICE_ID_SILVER_AU"),
      },
    ],
  },
  {
    type: EMembershipType.GOLD,
    status: EMembershipStatus.ACTIVE,
    discount: 15,
    onDemandMinutes: 30,
    preBookedMinutes: 60,
    isMostPopular: false,
    membershipPrices: [
      {
        region: EMembershipPricingRegion.GLOBAL,
        price: 269,
        gstRate: null,
        currency: ECurrencies.USD,
        stripePriceId: configService.getOrThrow<string>("STRIPE_PRICE_ID_GOLD_GLOBAL"),
      },
      {
        region: EMembershipPricingRegion.AU,
        price: 296,
        gstRate: 10,
        currency: ECurrencies.AUD,
        stripePriceId: configService.getOrThrow<string>("STRIPE_PRICE_ID_GOLD_AU"),
      },
    ],
  },
];
