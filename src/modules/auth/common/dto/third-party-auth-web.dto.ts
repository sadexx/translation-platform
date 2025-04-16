import { ERegistrableUserRoleName } from "src/modules/roles/common/enums";
import { IsEnum, IsOptional } from "class-validator";
import { DeviceInfoDto } from "src/modules/auth/common/dto";

export class ThirdPartyAuthWebDto extends DeviceInfoDto {
  @IsOptional()
  @IsEnum(ERegistrableUserRoleName)
  role: ERegistrableUserRoleName;
}
