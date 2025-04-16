export enum EAppointmentSchedulingType {
  ON_DEMAND = "on-demand",
  PRE_BOOKED = "pre-booked",
}

export const appointmentSchedulingTypeOrder: Record<EAppointmentSchedulingType, number> = {
  [EAppointmentSchedulingType.ON_DEMAND]: 1,
  [EAppointmentSchedulingType.PRE_BOOKED]: 2,
};
