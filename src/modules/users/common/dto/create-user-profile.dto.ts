import { CreateAddressDto } from "src/modules/addresses/common/dto";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, ValidateNested } from "class-validator";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class CreateUserProfileDto {
  @IsOptional()
  @IsEnum(EUserRoleName)
  userRole?: EUserRoleName;

  @ValidateNested()
  @Type(() => CreateUserProfileInformationDto)
  profileInformation: CreateUserProfileInformationDto;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  residentialAddress: CreateAddressDto;
}
