import { IsEnum } from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class SelectRoleDto {
  @IsEnum(EUserRoleName)
  role: EUserRoleName;
}
