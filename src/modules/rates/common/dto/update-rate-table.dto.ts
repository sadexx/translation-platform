import { IsArray, IsEnum, IsNumber, IsUUID, Min, ValidateIf, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/common/enums";
import { ERateDetailsSequence, ERateDetailsTime, ERateQualifier, ERateTiming } from "src/modules/rates/common/enums";

export class RateDto {
  @IsUUID()
  id: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsEnum(EAppointmentCommunicationType)
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  interpretingType: EAppointmentInterpretingType;

  @IsEnum(ERateQualifier)
  qualifier: ERateQualifier;

  @IsEnum(ERateTiming)
  details: ERateTiming;

  @IsEnum(ERateDetailsSequence)
  detailsSequence: ERateDetailsSequence;

  @IsEnum(ERateDetailsTime)
  detailsTime: ERateDetailsTime;

  @IsNumber()
  @Min(0)
  paidByTakerGeneralWithGst: number;

  @IsNumber()
  @Min(0)
  paidByTakerGeneralWithoutGst: number;

  @ValidateIf((obj) => obj.paidByTakerSpecialWithGst !== null)
  @IsNumber()
  @Min(0)
  paidByTakerSpecialWithGst: number | null;

  @ValidateIf((obj) => obj.paidByTakerSpecialWithoutGst !== null)
  @IsNumber()
  @Min(0)
  paidByTakerSpecialWithoutGst: number | null;

  @IsNumber()
  @Min(0)
  lfhCommissionGeneral: number;

  @ValidateIf((obj) => obj.lfhCommissionSpecial !== null)
  @IsNumber()
  @Min(0)
  lfhCommissionSpecial: number | null;

  @IsNumber()
  @Min(0)
  paidToInterpreterGeneralWithGst: number;

  @IsNumber()
  @Min(0)
  paidToInterpreterGeneralWithoutGst: number;

  @ValidateIf((obj) => obj.paidToInterpreterSpecialWithGst !== null)
  @IsNumber()
  @Min(0)
  paidToInterpreterSpecialWithGst: number | null;

  @ValidateIf((obj) => obj.paidToInterpreterSpecialWithoutGst !== null)
  @IsNumber()
  @Min(0)
  paidToInterpreterSpecialWithoutGst: number | null;
}

export class UpdateRateTableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateDto)
  data: RateDto[];
}
