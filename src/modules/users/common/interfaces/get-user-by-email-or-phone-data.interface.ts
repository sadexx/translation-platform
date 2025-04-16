import { FindOptionsRelations } from "typeorm";
import { User } from "src/modules/users/entities";

export class IGetUserByEmailOrPhoneData {
  identification: string;
  relations?: FindOptionsRelations<User>;
}
