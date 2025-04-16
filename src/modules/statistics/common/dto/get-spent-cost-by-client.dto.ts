import { IsUUID } from "class-validator";
import { GetAppointmentsByDatesDto } from "src/modules/statistics/common/dto";

export class GetSpentCostByClient extends GetAppointmentsByDatesDto {
  @IsUUID()
  userRoleId: string;
}
