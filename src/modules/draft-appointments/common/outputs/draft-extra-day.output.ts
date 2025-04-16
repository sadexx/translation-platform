import { Exclude, Expose } from "class-transformer";
import { DraftAddressOutput } from "src/modules/draft-appointments/common/outputs";
import { DraftAppointment } from "src/modules/draft-appointments/entities";

export class DraftExtraDayOutput {
  @Expose()
  id: string;

  @Exclude()
  draftAppointment: DraftAppointment;

  @Expose()
  draftAddress: DraftAddressOutput | null;

  @Expose()
  scheduledStartTime: Date;

  @Expose()
  schedulingDurationMin: number;

  @Expose()
  sameAddress: boolean | null;

  @Expose()
  notes: string | null;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
