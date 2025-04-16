import { IsArray, IsEnum, IsISO8601, IsNumber, Min, ValidateNested } from "class-validator";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { Type } from "class-transformer";

export class CalculatePriceDto {
  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsEnum(EAppointmentCommunicationType)
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  interpretingType: EAppointmentInterpretingType;

  @IsEnum(EAppointmentTopic)
  topic: EAppointmentTopic;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsISO8601()
  scheduleDateTime: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculatePriceExtraDayDto)
  extraDays: CalculatePriceExtraDayDto[];
}

export class CalculatePriceExtraDayDto {
  @IsNumber()
  @Min(1)
  duration: number;

  @IsISO8601()
  scheduleDateTime: string;
}
