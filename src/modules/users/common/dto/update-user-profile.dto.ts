import { Type } from "class-transformer";
import { IsEnum, IsOptional, ValidateNested } from "class-validator";
import { UpdateUserProfileInformationDto } from "src/modules/users/common/dto";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { UpdateAddressDto } from "src/modules/addresses/common/dto";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsEnum(EUserRoleName)
  userRole?: EUserRoleName;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserProfileInformationDto)
  profileInformation?: UpdateUserProfileInformationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAddressDto)
  residentialAddress?: UpdateAddressDto;
}
