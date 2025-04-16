import { Exclude, Expose } from "class-transformer";

export class MultiWayParticipantOutput {
  @Exclude()
  id: string;

  @Exclude()
  appointmentId: string;

  @Expose()
  name: string;

  @Expose()
  age: number;

  @Expose()
  phoneCode: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  email: string;

  @Exclude()
  creationDate: Date;

  @Exclude()
  updatingDate: Date;
}
