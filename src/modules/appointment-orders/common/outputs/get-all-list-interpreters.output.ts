import { PaginationOutput } from "src/common/outputs";
import { IListInterpreters } from "src/modules/appointment-orders/common/interface";

export class GetAllListInterpretersOutput extends PaginationOutput {
  data: IListInterpreters[];
}
