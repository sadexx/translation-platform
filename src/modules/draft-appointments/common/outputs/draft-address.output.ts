import { Exclude, Expose } from "class-transformer";
import { DraftAppointment, DraftExtraDay } from "src/modules/draft-appointments/entities";

export class DraftAddressOutput {
  @Expose()
  id: string;

  @Exclude()
  draftAppointment: DraftAppointment;

  @Exclude()
  draftExtraDay: DraftExtraDay;

  @Expose()
  latitude: number;

  @Expose()
  longitude: number;

  @Expose()
  country: string;

  @Expose()
  state: string;

  @Expose()
  suburb: string;

  @Expose()
  streetName: string;

  @Expose()
  streetNumber: string;

  @Expose()
  postcode: string;

  @Expose()
  building: string | null;

  @Expose()
  unit: string | null;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
