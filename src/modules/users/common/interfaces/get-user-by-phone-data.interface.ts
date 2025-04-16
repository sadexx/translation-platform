import { FindOptionsRelations } from "typeorm";
import { User } from "src/modules/users/entities";

export interface IGetUserByPhoneData {
  phoneNumber: string;
  relations?: FindOptionsRelations<User>;
}
