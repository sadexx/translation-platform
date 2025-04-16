export enum EAppointmentCommunicationType {
  VIDEO = "video",
  AUDIO = "audio",
  FACE_TO_FACE = "face-to-face",
}

export const appointmentCommunicationTypeOrder: Record<EAppointmentCommunicationType, number> = {
  [EAppointmentCommunicationType.AUDIO]: 1,
  [EAppointmentCommunicationType.VIDEO]: 2,
  [EAppointmentCommunicationType.FACE_TO_FACE]: 3,
};
