import { IsEnum, IsNumber, IsOptional } from "class-validator";
import { EAppointmentInterpreterType } from "src/modules/appointments/common/enums";

export class GenerateRateTableDto {
  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsOptional()
  @IsNumber()
  onDemandAudioStandardFirst?: number;
}
