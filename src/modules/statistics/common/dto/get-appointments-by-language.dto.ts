import { IsEnum } from "class-validator";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { GetAppointmentsByDatesDto } from "src/modules/statistics/common/dto";

export class GetAppointmentsByLanguageDto extends GetAppointmentsByDatesDto {
  @IsEnum(ELanguages)
  languageFrom: ELanguages;

  @IsEnum(ELanguages)
  languageTo: ELanguages;
}
