import {
  IsLowercase,
  MinLength,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ECompanyActivitySphere, ECompanyEmployeesNumber } from "src/modules/companies/common/enums";

export class UpdateCompanyProfileInformationDto {
  @IsOptional()
  @IsUUID()
  id?: string;

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

  @IsEnum(ECompanyActivitySphere)
  activitySphere: ECompanyActivitySphere;

  @IsEnum(ECompanyEmployeesNumber)
  employeesNumber: ECompanyEmployeesNumber;

  @IsOptional()
  @IsNumber()
  @Min(100, { message: "Deposit Default Charge Amount must be at least 100" })
  @Max(1500, { message: "Deposit Default Charge Amount must be at most 1500" })
  depositDefaultChargeAmount?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  businessRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  abnNumber?: string;
}
