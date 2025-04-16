import { IsNotEmpty, IsISO8601 } from "class-validator";

export class GetAppointmentsByDatesDto {
  @IsNotEmpty()
  @IsISO8601()
  dateFrom: Date;

  @IsNotEmpty()
  @IsISO8601()
  dateTo: Date;
}
