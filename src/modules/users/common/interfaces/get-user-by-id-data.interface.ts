import { FindOptionsRelations } from "typeorm";
import { User } from "src/modules/users/entities";

export interface IGetUserByIdData {
  id: string;
  relations?: FindOptionsRelations<User>;
}
