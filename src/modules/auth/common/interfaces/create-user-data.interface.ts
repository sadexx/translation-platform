import { EUserRoleName } from "src/modules/roles/common/enums";
import { RegisterUserDto } from "src/modules/auth/common/dto";

export interface ICreateUserData extends RegisterUserDto {
  role: EUserRoleName;
  email: string;
  phoneNumber?: string;
}
