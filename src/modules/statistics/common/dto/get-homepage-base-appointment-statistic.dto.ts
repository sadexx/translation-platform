import { IsUUID } from "class-validator";
import { GetAppointmentsByDatesDto } from "src/modules/statistics/common/dto";

export class GetHomepageBaseAppointmentStatisticDto extends GetAppointmentsByDatesDto {
  @IsUUID()
  userRoleId: string;
}
