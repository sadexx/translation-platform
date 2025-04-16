export enum EAppointmentStatus {
  PENDING_PAYMENT_CONFIRMATION = "pending-payment-confirmation",
  PENDING = "pending",
  CANCELLED_ORDER = "cancelled-order",
  ACCEPTED = "accepted",
  CANCELLED = "cancelled",
  CANCELLED_BY_SYSTEM = "cancelled-by-system",
  LIVE = "live",
  COMPLETED = "completed",
  COMPLETED_ACTION_REQUIRED = "completed-action-required",
}

export const appointmentStatusOrder: Record<EAppointmentStatus, number> = {
  [EAppointmentStatus.LIVE]: 1,
  [EAppointmentStatus.PENDING]: 2,
  [EAppointmentStatus.ACCEPTED]: 3,
  [EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION]: 4,
  [EAppointmentStatus.COMPLETED_ACTION_REQUIRED]: 5,
  [EAppointmentStatus.COMPLETED]: 6,
  [EAppointmentStatus.CANCELLED]: 7,
  [EAppointmentStatus.CANCELLED_ORDER]: 8,
  [EAppointmentStatus.CANCELLED_BY_SYSTEM]: 9,
};
