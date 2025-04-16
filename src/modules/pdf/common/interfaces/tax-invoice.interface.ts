export interface ITaxInvoiceReceipt {
  companyName: string;
  companyAddress: string;
  companySuburb: string;
  companyState: string;
  companyPostcode: string;
  companyABN: string;

  supplierName: string;
  supplierAddress: string;
  supplierSuburb: string;
  supplierState: string;
  supplierPostcode: string;
  supplierABN: string;

  invoiceDate: string;
  interpreterId: string;
  bookingId: string;
  serviceDate: string;
  description: string;
  duration: string;
  valueExclGST: string;
  valueGST: string;
  total: string;
}

export interface ITaxInvoiceReceiptWithKey {
  receiptKey: string;
  receiptData: ITaxInvoiceReceipt;
}
