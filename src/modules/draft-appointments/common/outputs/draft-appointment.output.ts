import { Expose, Type } from "class-transformer";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import {
  ClientDraftAppointmentOutput,
  DraftAddressOutput,
  DraftExtraDayOutput,
  DraftMultiWayParticipantOutput,
} from "src/modules/draft-appointments/common/outputs";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { EUserGender } from "src/modules/users/common/enums";

export class DraftAppointmentOutput {
  @Expose()
  id: string;

  @Expose()
  platformId: string;

  @Expose()
  clientId: string;

  @Expose()
  @Type(() => ClientDraftAppointmentOutput)
  client: ClientDraftAppointmentOutput;

  @Expose()
  @Type(() => DraftMultiWayParticipantOutput)
  draftParticipants: DraftMultiWayParticipantOutput[];

  @Expose()
  @Type(() => DraftAddressOutput)
  draftAddress: DraftAddressOutput | null;

  @Expose()
  @Type(() => DraftExtraDayOutput)
  draftExtraDays: DraftExtraDayOutput[];

  @Expose()
  scheduledStartTime: Date;

  @Expose()
  communicationType: EAppointmentCommunicationType;

  @Expose()
  schedulingType: EAppointmentSchedulingType;

  @Expose()
  schedulingDurationMin: number;

  @Expose()
  topic: EAppointmentTopic;

  @Expose()
  preferredInterpreterGender: EUserGender | null;

  @Expose()
  interpreterType: EAppointmentInterpreterType;

  @Expose()
  interpretingType: EAppointmentInterpretingType;

  @Expose()
  languageFrom: ELanguages;

  @Expose()
  languageTo: ELanguages;

  @Expose()
  participantType: EAppointmentParticipantType;

  @Expose()
  alternativePlatform: boolean;

  @Expose()
  alternativeVideoConferencingPlatformLink: string | null;

  @Expose()
  notes: string | null;

  @Expose()
  schedulingExtraDay: boolean;

  @Expose()
  status: string;

  @Expose()
  isGroupAppointment: boolean;

  @Expose()
  sameInterpreter: boolean;

  @Expose()
  operatedByCompanyName: string;

  @Expose()
  operatedByCompanyId: string;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
