import { LoginDto } from "src/modules/auth/common/dto";

export interface ILoginUserData extends LoginDto {
  IPAddress: string;
  userAgent: string;
}
