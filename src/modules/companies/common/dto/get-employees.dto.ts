import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ALLOWED_EMPLOYEE_ROLES } from "src/modules/companies/common/constants/constants";
import { ESortOrder } from "src/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";

export class GetEmployeesDto extends PaginationQueryDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EAccountStatus, { each: true })
  statuses?: EAccountStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsIn(ALLOWED_EMPLOYEE_ROLES, { each: true })
  roles?: EUserRoleName[];

  @IsOptional()
  @IsEnum(ESortOrder)
  accountStatusOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  nameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  userRoleOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  phoneNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  emailOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  suburbOrder?: ESortOrder;
}
