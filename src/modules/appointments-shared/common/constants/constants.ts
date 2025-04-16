import { EAppointmentCommunicationType, EAppointmentStatus } from "src/modules/appointments/common/enums";

export const AUDIO_VIDEO_COMMUNICATION_TYPES: EAppointmentCommunicationType[] = [
  EAppointmentCommunicationType.AUDIO,
  EAppointmentCommunicationType.VIDEO,
];

export const CONFLICT_APPOINTMENT_CONFIRMED_STATUSES: EAppointmentStatus[] = [
  EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION,
  EAppointmentStatus.PENDING,
  EAppointmentStatus.ACCEPTED,
  EAppointmentStatus.LIVE,
];

export const CONFLICT_APPOINTMENT_ACCEPTED_STATUSES: EAppointmentStatus[] = [
  EAppointmentStatus.ACCEPTED,
  EAppointmentStatus.LIVE,
];

export const CANCELLED_APPOINTMENT_STATUSES: EAppointmentStatus[] = [
  EAppointmentStatus.CANCELLED,
  EAppointmentStatus.CANCELLED_ORDER,
  EAppointmentStatus.CANCELLED_BY_SYSTEM,
];

export const COMPLETED_APPOINTMENT_STATUSES: EAppointmentStatus[] = [
  ...CANCELLED_APPOINTMENT_STATUSES,
  EAppointmentStatus.COMPLETED,
];
