import { PaginationOutput } from "src/common/outputs";
import { IGetIndividualPayment } from "src/modules/payments/common/interfaces/get-individual-payment.interface";

export interface IGetIndividualPaymentResponse extends PaginationOutput {
  data: IGetIndividualPayment[];
}
