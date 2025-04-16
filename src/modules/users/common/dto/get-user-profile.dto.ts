import { IsEnum, IsNotEmpty } from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class GetUserProfileDto {
  @IsNotEmpty()
  @IsEnum(EUserRoleName)
  roleName: EUserRoleName;
}
