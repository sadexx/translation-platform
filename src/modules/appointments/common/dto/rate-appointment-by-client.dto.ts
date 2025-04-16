import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { IsFeedbackRequiredForInterpreterRating } from "src/modules/appointments/common/validators";

export class RateAppointmentByClientDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsFeedbackRequiredForInterpreterRating()
  interpreterRating: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  interpreterRatingFeedback?: string;
}
