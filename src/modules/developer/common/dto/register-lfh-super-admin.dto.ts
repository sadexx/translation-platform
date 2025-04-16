import { IsEnum, IsString, Matches, MinLength } from "class-validator";
import { ESuperAdminEmail } from "src/modules/auth/common/enums";

export class RegisterLfhSuperAdminDto {
  @IsEnum(ESuperAdminEmail)
  email: ESuperAdminEmail;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z]).{8,}$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter.",
  })
  password: string;
}
