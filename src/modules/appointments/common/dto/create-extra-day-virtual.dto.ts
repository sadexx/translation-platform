import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { IsFutureDate } from "src/common/validators";

export class CreateExtraDayVirtualDto {
  @IsDateString()
  @IsFutureDate()
  scheduledStartTime: Date;

  @IsNotEmpty()
  @IsNumber()
  @Min(15, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(480, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
