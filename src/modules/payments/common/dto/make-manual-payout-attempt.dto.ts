import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class MakeManualPayoutAttemptDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  appointmentId: string;
}
