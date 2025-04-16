import { EPaymentStatus } from "src/modules/payments/common/enums";
import { PaymentItem } from "src/modules/payments/entities";

export interface IGetUserPayment {
  invoiceNumber: string | undefined;
  appointmentDate: string | null;
  dueDate: string | null;
  amount: string;
  status: EPaymentStatus;
  paymentMethod: string | null;
  internalReceiptKey: string | null;
  taxInvoiceKey: string | null;
  note: string | null;
  items: PaymentItem[];
}
