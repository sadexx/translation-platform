import { IsBoolean, IsEnum, IsString } from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class EditPermissionsByModuleDto {
  @IsEnum(EUserRoleName)
  userRole: EUserRoleName;

  @IsString()
  module: string;

  @IsBoolean()
  isAllowed: boolean;
}
