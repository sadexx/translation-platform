import { CreatePasswordDto } from "src/modules/auth/common/dto";

export interface ICreatePasswordData extends CreatePasswordDto {
  email: string;
}
