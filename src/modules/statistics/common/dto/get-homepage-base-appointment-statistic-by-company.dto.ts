import { IsUUID } from "class-validator";
import { GetAppointmentsByDatesDto } from "src/modules/statistics/common/dto";

export class GetHomepageBaseAppointmentStatisticByCompanyDto extends GetAppointmentsByDatesDto {
  @IsUUID()
  companyId: string;
}
