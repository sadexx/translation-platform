import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  EAppointmentInterpreterType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { IsAbsentIfNotMultiWay } from "src/modules/appointments/common/validators";
import { EUserGender } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { Type } from "class-transformer";
import { IsFutureDate } from "src/common/validators";
import { CreateMultiWayParticipantDto } from "src/modules/multi-way-participant/common/dto";
import {
  IsSameInterpreterValid,
  IsSchedulingExtraDayValid,
  IsValidSignLanguageSelection,
} from "src/modules/appointments-shared/common/validators";

export class CreateAppointmentDto {
  @IsDateString()
  @IsFutureDate()
  scheduledStartTime: Date;

  @IsEnum(EAppointmentSchedulingType)
  schedulingType: EAppointmentSchedulingType;

  @IsNotEmpty()
  @IsNumber()
  @Min(15, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(480, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin: number;

  @IsEnum(EAppointmentTopic)
  topic: EAppointmentTopic;

  @IsOptional()
  @IsEnum(EUserGender)
  preferredInterpreterGender?: EUserGender;

  @IsEnum(EAppointmentInterpreterType)
  interpreterType: EAppointmentInterpreterType;

  @IsEnum(ELanguages, { message: "language from is not valid" })
  @IsValidSignLanguageSelection()
  languageFrom: ELanguages;

  @IsEnum(ELanguages, { message: "language to is not valid" })
  languageTo: ELanguages;

  @IsEnum(EAppointmentParticipantType)
  participantType: EAppointmentParticipantType;

  @ValidateNested({ each: true })
  @Type(() => CreateMultiWayParticipantDto)
  @IsAbsentIfNotMultiWay()
  participants?: CreateMultiWayParticipantDto[];

  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @IsBoolean()
  @IsSchedulingExtraDayValid()
  schedulingExtraDay: boolean;

  @IsBoolean()
  @IsSameInterpreterValid()
  sameInterpreter: boolean;

  @IsBoolean()
  acceptOvertimeRates: boolean;
}
