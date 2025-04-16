import { Expose, Type } from "class-transformer";
import { EUserGender } from "src/modules/users/common/enums";

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

export class ClientAppointmentOutput {
  @Expose()
  id: string;

  @Expose()
  @Type(() => ClientAppointmentUserOutput)
  user: ClientAppointmentUserOutput;

  @Expose()
  @Type(() => ClientAppointmentProfileOutput)
  profile: ClientAppointmentProfileOutput;
}
