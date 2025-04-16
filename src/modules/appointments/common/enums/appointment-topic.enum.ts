export enum EAppointmentTopic {
  GENERAL = "general",
  LEGAL = "legal",
  MEDICAL = "medical",
}

export const appointmentTopicOrder: Record<EAppointmentTopic, number> = {
  [EAppointmentTopic.GENERAL]: 1,
  [EAppointmentTopic.LEGAL]: 2,
  [EAppointmentTopic.MEDICAL]: 3,
};
