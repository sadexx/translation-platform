export interface IGetHomepageBaseAppointmentStatistic {
  all: IGetHomepageBaseAppointmentStatisticData;
  onDemand: IGetHomepageBaseAppointmentStatisticData;
  preBooked: IGetHomepageBaseAppointmentStatisticData;
}

export interface IGetHomepageBaseAppointmentStatisticData {
  count: number;
  duration: number;
}
