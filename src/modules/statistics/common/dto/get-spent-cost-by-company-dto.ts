import { IsUUID } from "class-validator";
import { GetAppointmentsByDatesDto } from "src/modules/statistics/common/dto";

export class GetSpentCostByCompany extends GetAppointmentsByDatesDto {
  @IsUUID()
  companyId: string;
}
