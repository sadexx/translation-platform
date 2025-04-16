import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, Max, MaxLength, Min } from "class-validator";
import { EAppointmentParticipantType, EAppointmentTopic } from "src/modules/appointments/common/enums";
import { IsValidAlternativePlatform } from "src/modules/appointments/common/validators";
import { EUserGender } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { IsFutureDate } from "src/common/validators";

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  scheduledStartTime?: Date;

  @IsOptional()
  @IsNumber()
  @Min(15, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(480, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin?: number;

  @IsOptional()
  @IsEnum(EAppointmentTopic)
  topic?: EAppointmentTopic;

  @IsOptional()
  @IsEnum(EUserGender)
  preferredInterpreterGender?: EUserGender;

  @IsOptional()
  @IsEnum(ELanguages, { message: "Language from is not valid" })
  languageFrom?: ELanguages;

  @IsOptional()
  @IsEnum(ELanguages, { message: "Language to is not valid" })
  languageTo?: ELanguages;

  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  alternativePlatform?: boolean;

  @IsValidAlternativePlatform()
  alternativeVideoConferencingPlatformLink?: string;

  @IsOptional()
  @IsEnum(EAppointmentParticipantType)
  participantType: EAppointmentParticipantType;
}
