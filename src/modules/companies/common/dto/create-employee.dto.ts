import {
  IsEmail,
  IsIn,
  IsLowercase,
  IsOptional,
  IsPhoneNumber,
  IsUUID,
  MinLength,
  ValidateNested,
} from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { Type } from "class-transformer";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";
import { CreateAddressDto } from "src/modules/addresses/common/dto";
import { ALLOWED_EMPLOYEE_ROLES } from "src/modules/companies/common/constants/constants";

export class CreateEmployeeDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsIn(ALLOWED_EMPLOYEE_ROLES)
  role: EUserRoleName;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  email: string;

  @IsPhoneNumber()
  phoneNumber: string;

  @ValidateNested()
  @Type(() => CreateUserProfileInformationDto)
  profileInformation: CreateUserProfileInformationDto;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  businessAddress: CreateAddressDto;
}
