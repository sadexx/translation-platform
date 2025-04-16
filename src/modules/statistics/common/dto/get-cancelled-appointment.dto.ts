import { IsIn, IsNotEmpty } from "class-validator";
import { ROLES_WHICH_CAN_CANCEL_APPOINTMENT_WITH_ALL } from "src/modules/statistics/common/constants/constants";
import { CommaSeparatedToArray } from "src/common/decorators";
import { GetAppointmentsByTypeDto } from "src/modules/statistics/common/dto";

export class GetCancelledAppointmentDto extends GetAppointmentsByTypeDto {
  @IsNotEmpty()
  @CommaSeparatedToArray()
  @IsIn(ROLES_WHICH_CAN_CANCEL_APPOINTMENT_WITH_ALL, { each: true })
  roleNames: string[];
}
