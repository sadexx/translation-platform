import { EJobType, EQueueType } from "src/modules/queues/common/enums";
import { IProcessAppointmentDiscounts } from "src/modules/discounts/common/interfaces";
import { IProcessNotifyMembershipChanges } from "src/modules/memberships/common/interfaces";
import {
  IProcessStripeCancelSubscriptions,
  IProcessStripeUpdateSubscriptionPrice,
  IProcessStripeWebhook,
} from "src/modules/stripe/common/interfaces";
import { IProcessSumSubWebhook } from "src/modules/sumsub/common/interfaces";
import { IProcessDocusignWebhook } from "src/modules/docusign/common/interfaces";

export interface IQueueData {
  queueEnum: EQueueType;
  jobItem: IQueueJobType;
}

export interface IQueueDataBulk {
  queueEnum: EQueueType;
  jobItems: IQueueJobType[];
}

export interface IProcessAppointmentDiscountsData {
  jobName: EJobType.PROCESS_APPOINTMENT_DISCOUNTS;
  payload: IProcessAppointmentDiscounts;
}

export interface IProcessNotifyMembershipChangesData {
  jobName: EJobType.PROCESS_NOTIFY_MEMBERSHIP_CHANGES;
  payload: IProcessNotifyMembershipChanges;
}

export interface IProcessStripeCancelSubscriptionsData {
  jobName: EJobType.PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS;
  payload: IProcessStripeCancelSubscriptions;
}

export interface IProcessStripeUpdateSubscriptionPriceData {
  jobName: EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE;
  payload: IProcessStripeUpdateSubscriptionPrice;
}
export interface IProcessSumSubWebhookData {
  jobName: EJobType.PROCESS_SUMSUB_WEBHOOK;
  payload: IProcessSumSubWebhook;
}

export interface IProcessDocusignWebhookData {
  jobName: EJobType.PROCESS_DOCUSIGN_WEBHOOK;
  payload: IProcessDocusignWebhook;
}

export interface IProcessStripeWebhookData {
  jobName: EJobType.PROCESS_STRIPE_WEBHOOK;
  payload: IProcessStripeWebhook;
}

export type IQueueJobType =
  | IProcessAppointmentDiscountsData
  | IProcessNotifyMembershipChangesData
  | IProcessStripeCancelSubscriptionsData
  | IProcessStripeUpdateSubscriptionPriceData
  | IProcessSumSubWebhookData
  | IProcessDocusignWebhookData
  | IProcessStripeWebhookData;
