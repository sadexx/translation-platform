import { EMembershipType } from "src/modules/memberships/common/enums";

export interface IPayInReceipt {
  userName: string;
  clientId: string;
  addressLine1: string;
  addressLine2: string;
  currency: string;
  issueDate: string;
  total: string;
  gstAmount: string;
  invoiceTotal: string;
  amountPaid: string;
  amountDue: string;
  bookingId: string;
  service: string;
  topic: string;
  serviceDate: string;
  interpreterId: string;
  duration: string;
  date: string;
  description: string;
  paymentTotal: string;
  thisInvoice: string;
  receiptNumber: string;

  promoCampaignDiscount: number | null;
  membershipDiscount: number | null;
  promoCampaignDiscountMinutes: number | null;
  membershipFreeMinutes: number | null;
  promoCode: string | null;
  membershipType: EMembershipType | null;
}

export interface IPayInReceiptWithKey {
  receiptKey: string;
  receiptData: IPayInReceipt;
}
