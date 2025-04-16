import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  MinLength,
  IsLowercase,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ECompanyActivitySphere, ECompanyEmployeesNumber, ECompanyType } from "src/modules/companies/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";

export class CreateCompanyDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 100)
  contactPerson: string;

  @IsPhoneNumber()
  phoneNumber: string;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  contactEmail: string;

  @IsEnum(EExtCountry, {
    message: "Country must be one of the following: " + Object.values(EExtCountry).join(", "),
  })
  country: EExtCountry;

  @IsEnum(ECompanyActivitySphere)
  activitySphere: ECompanyActivitySphere;

  @IsEnum(ECompanyEmployeesNumber)
  employeesNumber: ECompanyEmployeesNumber;

  @IsEnum(ECompanyType)
  companyType: ECompanyType;

  @IsNotEmpty()
  @IsString()
  adminName: string;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  adminEmail: string;

  @IsUUID()
  @IsOptional()
  operatedBy?: string;

  @IsOptional()
  @IsNumber()
  @Min(100, { message: "Deposit Default Charge Amount must be at least 100" })
  @Max(1500, { message: "Deposit Default Charge Amount must be at most 1500" })
  depositDefaultChargeAmount?: number;
}
