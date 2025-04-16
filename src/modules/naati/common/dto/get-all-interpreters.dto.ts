import { IsEnum, IsOptional, ValidateIf } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { EExtInterpreterLevel, EExtNaatiInterpreterType } from "src/modules/naati/common/enum";

export class GetAllInterpretersDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EExtNaatiInterpreterType)
  interpreterType?: EExtNaatiInterpreterType;

  @IsOptional()
  @IsEnum(ELanguages)
  mainSectionLanguage?: ELanguages;

  @IsOptional()
  @IsEnum(EExtInterpreterLevel, { message: "interpreter level is not valid" })
  interpreterLevel?: EExtInterpreterLevel;

  @ValidateIf((obj) => obj.languageTo !== undefined)
  @IsOptional()
  @IsEnum(ELanguages, { message: "language from is not valid" })
  languageFrom?: ELanguages;

  @ValidateIf((obj) => obj.languageFrom !== undefined)
  @IsOptional()
  @IsEnum(ELanguages, { message: "language to is not valid" })
  languageTo?: ELanguages;
}
