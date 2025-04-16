import { IListInterpreters } from "src/modules/appointment-orders/common/interface";

export interface IResultListInterpreters {
  result: { data: IListInterpreters[] | null; total: number };
}
