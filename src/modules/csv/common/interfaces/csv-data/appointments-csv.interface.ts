import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { ECurrencies } from "src/modules/payments/common/enums";
import { EMembershipType } from "src/modules/memberships/common/enums";

export interface IAppointmentsCsv {
  platformId: string;
  status: EAppointmentStatus;
  interpreterType: EAppointmentInterpreterType;
  schedulingType: EAppointmentSchedulingType;
  communicationType: EAppointmentCommunicationType;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  schedulingDurationMin: number;
  interpreterFullName: string | null;
  interpreterRole: EUserRoleName | null;
  clientFullName: string;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  topic: EAppointmentTopic;
  creationDate: Date;
  paidByClient: number | null;
  clientCurrency: ECurrencies | null;
  receivedByInterpreter: number | null;
  interpreterCurrency: ECurrencies | null;
  appointmentCallRating: number | null;
  interpreterRating: number | null;
  promoCampaignDiscount: number | null;
  membershipDiscount: number | null;
  promoCampaignDiscountMinutes: number | null;
  membershipFreeMinutes: number | null;
  promoCode: string | null;
  membershipType: EMembershipType | null;
}
