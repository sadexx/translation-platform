import { IsBase64, IsDateString, IsOptional } from "class-validator";
import {
  IsAdminAlternativeTimeValid,
  IsClientAlternativeTimeValid,
  IsInterpreterAlternativeTimeValid,
} from "src/modules/appointments/common/validators";

export class EndAppointmentDto {
  @IsOptional()
  @IsDateString()
  @IsClientAlternativeTimeValid()
  clientAlternativeScheduledStartTime?: Date;

  @IsOptional()
  @IsDateString()
  @IsClientAlternativeTimeValid()
  clientAlternativeScheduledEndTime?: Date;

  @IsOptional()
  @IsDateString()
  @IsInterpreterAlternativeTimeValid()
  interpreterAlternativeScheduledStartTime?: Date;

  @IsOptional()
  @IsDateString()
  @IsInterpreterAlternativeTimeValid()
  interpreterAlternativeScheduledEndTime?: Date;

  @IsOptional()
  @IsDateString()
  @IsAdminAlternativeTimeValid()
  adminAlternativeScheduledStartTime?: Date;

  @IsOptional()
  @IsDateString()
  @IsAdminAlternativeTimeValid()
  adminAlternativeScheduledEndTime?: Date;

  @IsOptional()
  @IsBase64()
  clientSignature?: string;

  @IsOptional()
  @IsBase64()
  interpreterSignature?: string;

  @IsOptional()
  @IsBase64()
  adminSignature?: string;
}
