import { Exclude, Expose } from "class-transformer";
import { DraftAppointment } from "src/modules/draft-appointments/entities";

export class DraftMultiWayParticipantOutput {
  @Expose()
  id: string;

  @Exclude()
  draftAppointment: DraftAppointment;

  @Expose()
  name: string;

  @Expose()
  age: number | null;

  @Expose()
  phoneCode: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  email: string | null;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
