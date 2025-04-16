import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";

export class GetDropdownUsersDto {
  @CommaSeparatedToArray()
  @IsEnum(EUserRoleName, { each: true })
  roles: EUserRoleName[];

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @IsUUID()
  operatedByCompanyId?: string;
}
