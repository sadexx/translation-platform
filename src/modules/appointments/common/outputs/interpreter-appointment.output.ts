import { Expose, Type } from "class-transformer";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { EUserGender } from "src/modules/users/common/enums";

class InterpreterAppointmentUserOutput {
  @Expose()
  id: string;

  @Expose()
  platformId: string;

  @Expose()
  avatarUrl: string;
}

class InterpreterAppointmentRoleOutput {
  @Expose()
  name: EUserRoleName;
}

class InterpreterAppointmentProfileOutput {
  @Expose()
  firstName: string;

  @Expose()
  gender: EUserGender;
}

export class InterpreterAppointmentOutput {
  @Expose()
  id: string;

  @Expose()
  @Type(() => InterpreterAppointmentUserOutput)
  user: InterpreterAppointmentUserOutput;

  @Expose()
  @Type(() => InterpreterAppointmentRoleOutput)
  role: InterpreterAppointmentRoleOutput;

  @Expose()
  @Type(() => InterpreterAppointmentProfileOutput)
  profile: InterpreterAppointmentProfileOutput;
}
