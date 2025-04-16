export enum EPaymentFailedReason {
  INFO_NOT_FILLED = "Payment information not filled",
  INCORRECT_CURRENCY = "New payment item currency must been the same like other payment items currencies",
  AUTH_FAILED = "Payment authorization failed",
  PROFILE_NOT_FILLED = "User profile not filled",
  CREATING_FAILED = "Payment creating failed",
  DEPOSIT_CHARGE_FAILED = "Deposit charge failed",
}
