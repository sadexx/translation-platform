import { IsIn, IsNotEmpty } from "class-validator";
import { ADMIN_STATISTICS_ALLOWED_VALUES } from "src/modules/statistics/common/constants/constants";
import { CommaSeparatedToArray } from "src/common/decorators";
import { GetAppointmentsByDatesDto } from "src/modules/statistics/common/dto";

export class GetAdminStatisticsDto extends GetAppointmentsByDatesDto {
  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsIn(ADMIN_STATISTICS_ALLOWED_VALUES, { each: true })
  roleNames: string[];
}
