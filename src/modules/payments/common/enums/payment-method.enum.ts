export enum EPaymentMethod {
  PAYPAL_ACCOUNT = "paypal-account",
  BANK_ACCOUNT = "bank-account",
  CREDIT_CARD = "credit-card",
  DEPOSIT = "deposit",
}

export const paymentMethodFilterMap: Record<EPaymentMethod, string> = {
  [EPaymentMethod.PAYPAL_ACCOUNT]: "Paypal Account",
  [EPaymentMethod.BANK_ACCOUNT]: "Bank Account",
  [EPaymentMethod.CREDIT_CARD]: "Credit Card",
  [EPaymentMethod.DEPOSIT]: "Deposit of company",
};
