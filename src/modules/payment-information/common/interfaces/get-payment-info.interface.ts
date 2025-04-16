import { EPaymentSystem } from "src/modules/payment-information/common/enums";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";

export interface IGetPaymentInfo {
  client: {
    last4?: string | null;
  };
  interpreter: {
    selectedSystemForPayout?: EPaymentSystem | null;
    stripe: {
      status?: EOnboardingStatus | null;
      bankAccountLast4?: string | null;
      cardLast4?: string | null;
    };
    paypal: {
      email?: string | null;
    };
  };
}
