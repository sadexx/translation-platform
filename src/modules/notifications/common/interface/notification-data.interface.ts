import {
  IAppointmentOrderInvitation,
  IOnDemandInvitation,
  ISearchConditions,
} from "src/modules/search-engine-logic/common/interface";
import {
  ENotificationDataType,
  ENotificationPlatformType,
  ENotificationUserTarget,
} from "src/modules/notifications/common/enum";
import { IAppointmentDetails } from "src/modules/appointments/common/interfaces";
import { IChatMessage } from "src/modules/chime-messaging-configuration/common/interfaces";
import { ICancelOnDemandInvitation } from "src/modules/appointment-orders/common/interface";
import { IDraftAppointmentDetails } from "src/modules/draft-appointments/common/interfaces";
import { IUserRoleDetails } from "src/modules/notifications/common/interface/user-role-details.interface";
import { ICompanyDetails } from "src/modules/notifications/common/interface/company-details.interface";

export interface INotificationData {
  data: NotificationData;
  platformTypes: ENotificationPlatformType;
  userTarget: ENotificationUserTarget;
}

export interface ITextInfoData {
  type: ENotificationDataType.TEXT_INFO;
}

export interface ISearchEngineData {
  type: ENotificationDataType.SEARCH_ENGINE;
  extraData: ISearchConditions;
}

export interface IOnDemandInvitationData {
  type: ENotificationDataType.ON_DEMAND_INVITATION;
  extraData: IOnDemandInvitation;
}

export interface ICancelOnDemandInvitationData {
  type: ENotificationDataType.CANCEL_ON_DEMAND_INVITATION;
  extraData: ICancelOnDemandInvitation;
}

export interface IWWCCVerificationData {
  type: ENotificationDataType.WWCC_VERIFICATION;
}

export interface IRightToWorkVerificationData {
  type: ENotificationDataType.RIGHT_TO_WORK_VERIFICATION;
}

export interface ILanguageDocVerificationData {
  type: ENotificationDataType.LANGUAGE_DOCS_VERIFICATION;
}

export interface IConcessionCardVerificationData {
  type: ENotificationDataType.CONCESSION_CARD_VERIFICATION;
}

export interface IAccountActivationData {
  type: ENotificationDataType.ACCOUNT_ACTIVATION;
}

export interface IAccountDeactivationData {
  type: ENotificationDataType.ACCOUNT_DEACTIVATION;
}

export interface IAppointmentOrderInvitationData {
  type: ENotificationDataType.APPOINTMENT_ORDER_INVITATION;
  extraData: IAppointmentOrderInvitation;
}

export interface IDraftAppointmentDetailsData {
  type: ENotificationDataType.DRAFT_APPOINTMENT_DETAILS;
  extraData: IDraftAppointmentDetails;
}

export interface IAppointmentDetailsData {
  type: ENotificationDataType.APPOINTMENT_DETAILS;
  extraData: IAppointmentDetails;
}

export interface IRedFlagDetailsData {
  type: ENotificationDataType.RED_FLAG_DETAILS;
  extraData: IAppointmentDetails;
}

export interface IAvatarVerificationData {
  type: ENotificationDataType.AVATAR_VERIFICATION;
}

export interface IChatMessageData {
  type: ENotificationDataType.CHAT_MESSAGE;
  extraData: IChatMessage;
}

export interface ILiveAppointmentEndingSoonData {
  type: ENotificationDataType.APPOINTMENT_ENDING_SOON;
  extraData: IAppointmentDetails;
}

export interface IAppointmentPaymentSucceededData {
  type: ENotificationDataType.APPOINTMENT_PAYMENT_SUCCEEDED;
  extraData: IAppointmentDetails;
}

export interface IAppointmentPaymentFailedData {
  type: ENotificationDataType.APPOINTMENT_PAYMENT_FAILED;
  extraData: IAppointmentDetails;
}

export interface IIncorrectPaymentInformationData {
  type: ENotificationDataType.INCORRECT_PAYMENT_INFORMATION;
  extraData: IUserRoleDetails;
}

export interface IDepositChargeSucceededData {
  type: ENotificationDataType.DEPOSIT_CHARGE_SUCCEEDED;
  extraData: ICompanyDetails;
}

export interface IDepositChargeFailedData {
  type: ENotificationDataType.DEPOSIT_CHARGE_FAILED;
  extraData: ICompanyDetails;
}

export type NotificationData =
  | ITextInfoData
  | IOnDemandInvitationData
  | ICancelOnDemandInvitationData
  | ISearchEngineData
  | IWWCCVerificationData
  | IRightToWorkVerificationData
  | ILanguageDocVerificationData
  | IConcessionCardVerificationData
  | IAccountActivationData
  | IAccountDeactivationData
  | IAppointmentOrderInvitationData
  | IDraftAppointmentDetailsData
  | IAppointmentDetailsData
  | IRedFlagDetailsData
  | IAvatarVerificationData
  | IChatMessageData
  | ILiveAppointmentEndingSoonData
  | IAppointmentPaymentSucceededData
  | IAppointmentPaymentFailedData
  | IIncorrectPaymentInformationData
  | IDepositChargeSucceededData
  | IDepositChargeFailedData;
