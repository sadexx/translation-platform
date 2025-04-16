import { EPaymentStatus } from "src/modules/payments/common/enums";

export interface IGetIndividualPayment {
  invoiceNumber: string | undefined;
  appointmentDate: string | null;
  dueDate: string | null;
  amount: string;
  status: EPaymentStatus;
  paymentMethod: string | null;
  internalReceiptKey: string | null;
  taxInvoiceKey: string | null;
  note: string | null;
}
