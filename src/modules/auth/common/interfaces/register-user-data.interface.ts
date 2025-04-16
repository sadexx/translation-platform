import { RegisterUserDto } from "src/modules/auth/common/dto";

export interface IRegisterUserData extends RegisterUserDto {
  IPAddress?: string;
  userAgent?: string;
}
