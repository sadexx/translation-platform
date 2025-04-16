import { PaginationOutput } from "src/common/outputs";
import { IGetUserPayment } from "src/modules/admin/common/interfaces/get-user-payment.interface";

export interface IGetUserPaymentResponse extends PaginationOutput {
  data: IGetUserPayment[];
}
