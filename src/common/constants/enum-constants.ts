import { EPaymentStatus } from "src/modules/payments/common/enums";

export const DUE_PAYMENT_STATUSES = [
  EPaymentStatus.CAPTURED,
  EPaymentStatus.TRANSFERED,
  EPaymentStatus.PAYOUT_SUCCESS,
  EPaymentStatus.SUCCESS,
];
