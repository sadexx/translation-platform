import { FindOptionsRelations } from "typeorm";
import { User } from "src/modules/users/entities";

export interface IGetUserByEmailData {
  email: string;
  relations?: FindOptionsRelations<User>;
}
