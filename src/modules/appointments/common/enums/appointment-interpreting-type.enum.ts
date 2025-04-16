export enum EAppointmentInterpretingType {
  CONSECUTIVE = "consecutive",
  SIGN_LANGUAGE = "sign-language",
  SIMULTANEOUS = "simultaneous",
  ESCORT = "escort",
}

export const appointmentInterpretingTypeOrder: Record<EAppointmentInterpretingType, number> = {
  [EAppointmentInterpretingType.CONSECUTIVE]: 1,
  [EAppointmentInterpretingType.SIGN_LANGUAGE]: 2,
  [EAppointmentInterpretingType.SIMULTANEOUS]: 3,
  [EAppointmentInterpretingType.ESCORT]: 4,
};
