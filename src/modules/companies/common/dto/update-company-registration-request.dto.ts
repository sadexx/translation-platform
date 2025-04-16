import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { ECompanyActivitySphere, ECompanyEmployeesNumber, ECompanyType } from "src/modules/companies/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";

export class UpdateCompanyRegistrationRequestDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  contactPerson?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsEnum(ECompanyActivitySphere)
  activitySphere?: ECompanyActivitySphere;

  @IsOptional()
  @IsEnum(ECompanyEmployeesNumber)
  employeesNumber?: ECompanyEmployeesNumber;

  @IsOptional()
  @IsEnum(ECompanyType)
  companyType?: ECompanyType;

  @IsOptional()
  @IsEnum(EExtCountry, {
    message: "Country must be one of the following: " + Object.values(EExtCountry).join(", "),
  })
  country?: EExtCountry;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  adminName?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsNumber()
  @Min(100, { message: "Deposit Default Charge Amount must be at least 100" })
  @Max(1500, { message: "Deposit Default Charge Amount must be at most 1500" })
  depositDefaultChargeAmount?: number;
}
