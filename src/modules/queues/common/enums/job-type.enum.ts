export enum EJobType {
  DEFAULT = "default",
  PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS = "process-stripe-cancel-subscriptions",
  PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE = "process-stripe-update-subscriptions-price",
  PROCESS_APPOINTMENT_DISCOUNTS = "process-appointment-discounts",
  PROCESS_NOTIFY_MEMBERSHIP_CHANGES = "process-notify-membership-changes",
  PROCESS_SUMSUB_WEBHOOK = "process-sumsub-webhook",
  PROCESS_DOCUSIGN_WEBHOOK = "process-docusign-webhook",
  PROCESS_STRIPE_WEBHOOK = "process-stripe-webhook",
}
