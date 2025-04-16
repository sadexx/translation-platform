import { EPaymentStatus } from "src/modules/payments/common/enums";

export interface ICreateTransfer {
  transferId?: string;
  paymentStatus: EPaymentStatus;
  paymentNote: string | null;
}
