import { Expose } from "class-transformer";
import { AppointmentCancellationInfoOutput } from "src/modules/appointments/common/outputs";

export class AppointmentAdminInfoOutput {
  @Expose()
  id: string;

  @Expose()
  isRedFlagEnabled: boolean;

  @Expose()
  message: string | null;

  @Expose()
  callRecordingS3Key: string;

  @Expose()
  completedMeetingDuration: number;

  @Expose()
  clientFirstName: string;

  @Expose()
  clientLastName: string;

  @Expose()
  clientPhone: string;

  @Expose()
  clientEmail: string;

  @Expose()
  clientDateOfBirth: string;

  @Expose()
  interpreterFirstName?: string | null;

  @Expose()
  interpreterLastName?: string | null;

  @Expose()
  interpreterPhone?: string | null;

  @Expose()
  interpreterEmail?: string | null;

  @Expose()
  interpreterDateOfBirth?: string | null;

  @Expose()
  deepArchiveRestoreExpirationDate: Date | null;

  @Expose()
  clientWasOnlineInBooking: Date | null;

  @Expose()
  interpreterWasOnlineInBooking: Date | null;

  @Expose()
  cancellations: AppointmentCancellationInfoOutput[];

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
