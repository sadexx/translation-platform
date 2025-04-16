import { Exclude, Expose, Type } from "class-transformer";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { EUserGender } from "src/modules/users/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import {
  AppointmentAdminInfoOutput,
  ClientAppointmentOutput,
  InterpreterAppointmentOutput,
} from "src/modules/appointments/common/outputs";
import { MultiWayParticipantOutput } from "src/modules/multi-way-participant/common/outputs";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { Address } from "src/modules/addresses/entities";
import { AppointmentEndDetail, AppointmentRating, AppointmentReminder } from "src/modules/appointments/entities";
import { BlacklistOutput } from "src/modules/blacklists/common/outputs";
import { ECurrencies } from "src/modules/payments/common/enums";
import { DiscountAssociation } from "src/modules/discounts/entities";
import { ADMIN_ROLES } from "src/common/constants";

export class AppointmentOutput {
  @Expose()
  id: string;

  @Expose()
  platformId: string;

  /**
   *? Individual Client
   */

  @Exclude()
  clientId: string;

  @Expose()
  @Type(() => ClientAppointmentOutput)
  client: ClientAppointmentOutput;

  @Expose({
    groups: [
      EUserRoleName.IND_CLIENT,
      EUserRoleName.CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
    ],
  })
  archivedByClient: boolean;

  @Expose({
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.IND_CLIENT,
      EUserRoleName.CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
    ],
  })
  paidByClient: number;

  @Expose({
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.IND_CLIENT,
      EUserRoleName.CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
    ],
  })
  clientCurrency: ECurrencies | null;

  /**
   *? Interpreter: Individual, Language Buddy
   */

  @Exclude()
  interpreterId?: string;

  @Expose({
    groups: [
      EUserRoleName.IND_CLIENT,
      EUserRoleName.CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
    ],
  })
  @Type(() => InterpreterAppointmentOutput)
  interpreter?: InterpreterAppointmentOutput;

  @Expose({
    groups: [
      EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
    ],
  })
  archivedByInterpreter: boolean;

  @Expose({
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
    ],
  })
  receivedByInterpreter: number;

  @Expose({
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
    ],
  })
  interpreterCurrency: ECurrencies | null;

  /**
   *? Relations Fields
   */

  @Exclude()
  @Type(() => AppointmentOrder)
  appointmentOrder: AppointmentOrder;

  @Exclude()
  @Type(() => ChimeMeetingConfiguration)
  chimeMeetingConfiguration?: ChimeMeetingConfiguration;

  @Exclude()
  @Type(() => MultiWayParticipantOutput)
  participants: MultiWayParticipantOutput[];

  @Expose()
  @Type(() => Address)
  address?: Address;

  @Exclude()
  @Type(() => AppointmentReminder)
  appointmentReminder: AppointmentReminder;

  @Exclude()
  @Type(() => AppointmentEndDetail)
  appointmentEndDetail: AppointmentEndDetail;

  @Expose({
    groups: ADMIN_ROLES,
  })
  @Type(() => AppointmentRating)
  appointmentRating: AppointmentRating;

  @Expose({
    groups: [
      EUserRoleName.SUPER_ADMIN,
      EUserRoleName.LFH_BOOKING_OFFICER,
      EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN,
      EUserRoleName.CORPORATE_CLIENTS_ADMIN,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_ADMIN,
    ],
  })
  @Type(() => AppointmentAdminInfoOutput)
  appointmentAdminInfo: AppointmentAdminInfoOutput;

  @Exclude()
  @Type(() => BlacklistOutput)
  blacklists: BlacklistOutput[];

  @Expose({
    groups: ADMIN_ROLES,
  })
  @Type(() => DiscountAssociation)
  discountAssociation: DiscountAssociation;

  /**
   ** Public Fields
   */

  @Expose()
  scheduledStartTime: Date;

  @Expose()
  scheduledEndTime: Date;

  @Expose()
  communicationType: EAppointmentCommunicationType;

  @Expose()
  schedulingType: EAppointmentSchedulingType;

  @Expose()
  schedulingDurationMin: number;

  @Expose()
  topic: EAppointmentTopic;

  @Expose({
    groups: [
      EUserRoleName.IND_CLIENT,
      EUserRoleName.CORPORATE_CLIENTS_IND_USER,
      EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
    ],
  })
  preferredInterpreterGender: EUserGender;

  @Expose()
  interpreterType: EAppointmentInterpreterType;

  @Expose()
  interpretingType: EAppointmentInterpretingType;

  @Expose()
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType;

  @Expose()
  languageFrom: ELanguages;

  @Expose()
  languageTo: ELanguages;

  @Expose()
  participantType: EAppointmentParticipantType;

  @Expose()
  alternativePlatform: boolean;

  @Expose()
  alternativeVideoConferencingPlatformLink: string;

  @Expose()
  notes: string;

  @Exclude()
  schedulingExtraDay: boolean;

  @Expose()
  status: EAppointmentStatus;

  @Expose()
  businessEndTime: Date;

  @Exclude()
  clientLastActiveTime: Date;

  @Expose()
  isGroupAppointment: boolean;

  @Expose()
  appointmentsGroupId: string;

  @Expose()
  sameInterpreter: boolean;

  @Expose()
  operatedByCompanyName: string;

  @Exclude()
  operatedByCompanyId: string;

  @Expose()
  channelId: string;

  @Expose()
  acceptOvertimeRates: boolean;

  @Exclude()
  timezone: string;

  @Exclude()
  acceptedDate: Date;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
