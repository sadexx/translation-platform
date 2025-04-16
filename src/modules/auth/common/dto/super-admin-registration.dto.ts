import { ESuperAdminEmail } from "src/modules/auth/common/enums";
import { IsEnum } from "class-validator";

export class SuperAdminRegistrationDto {
  @IsEnum(ESuperAdminEmail)
  email: ESuperAdminEmail;
}
