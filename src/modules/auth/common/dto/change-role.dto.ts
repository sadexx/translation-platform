import { IsEnum } from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { DeviceInfoDto } from "src/modules/auth/common/dto";

export class ChangeRoleDto extends DeviceInfoDto {
  @IsEnum(EUserRoleName)
  role: EUserRoleName;
}
