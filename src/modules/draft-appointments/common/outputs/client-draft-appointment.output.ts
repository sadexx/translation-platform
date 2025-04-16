import { Expose, Type } from "class-transformer";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { EUserGender } from "src/modules/users/common/enums";

class Role {
  @Expose()
  name: EUserRoleName;
}

class ClientAppointmentUserOutput {
  @Expose()
  id: string;

  @Expose()
  platformId: string;

  @Expose()
  avatarUrl: string;
}

class ClientAppointmentProfileOutput {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  gender: EUserGender;
}

export class ClientDraftAppointmentOutput {
  @Expose()
  id: string;

  @Expose()
  @Type(() => Role)
  role: Role;

  @Expose()
  @Type(() => ClientAppointmentUserOutput)
  user: ClientAppointmentUserOutput;

  @Expose()
  @Type(() => ClientAppointmentProfileOutput)
  profile: ClientAppointmentProfileOutput;
}
