import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { EInterpreterExperienceYears } from "src/modules/interpreter-questionnaire/common/enum";

export class UpdateInterpreterQuestionnaireDto {
  @IsUUID()
  @IsOptional()
  userRoleId?: string;

  @IsOptional()
  @IsEnum(EInterpreterExperienceYears)
  experienceYears?: EInterpreterExperienceYears;
}
