import { IsEmail, IsEnum, IsLowercase, IsPhoneNumber, IsString, Matches, MinLength } from "class-validator";
import { ESuperAdminEmail } from "src/modules/auth/common/enums";
import { ECompanyType } from "src/modules/companies/common/enums";

export class RegisterCompanyDto {
  @IsEnum(ESuperAdminEmail)
  lfhSuperAdminEmail: ESuperAdminEmail;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z]).{8,}$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter.",
  })
  lfhSuperAdminPassword: string;

  @IsEnum(ECompanyType)
  companyType: ECompanyType;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  adminEmail: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z]).{8,}$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter.",
  })
  adminPassword: string;

  @IsPhoneNumber()
  adminPhoneNumber: string;
}
