import { Payment } from "src/modules/payments/entities";
import { UserProfile } from "src/modules/users/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";

export interface ITransferReturnedInfo {
  paymentInfo: PaymentInformation;
  payment: Payment;
  profile: UserProfile;
}
