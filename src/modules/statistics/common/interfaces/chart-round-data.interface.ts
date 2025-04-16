export interface IChartRoundData {
  all: number;
  onDemand: number;
  preBooked: number;
  chart: IRoundData[];
}

export interface IRoundData {
  value: number;
  label: string;
}
