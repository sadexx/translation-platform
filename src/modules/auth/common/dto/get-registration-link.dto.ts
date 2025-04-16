import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";

export class GetRegistrationLinkDto {
  @IsOptional()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(EUserRoleName)
  role: EUserRoleName;
}
