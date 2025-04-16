import { Exclude, Expose, Type } from "class-transformer";
import { AppointmentOrderOutput } from "src/modules/appointment-orders/common/outputs/appointment-order.output";
import { ERepeatInterval } from "src/modules/appointment-orders/common/enum";

export class AppointmentOrderGroupOutput {
  @Expose()
  id: string;

  @Expose()
  platformId: string;

  @Expose()
  @Type(() => AppointmentOrderOutput)
  appointmentOrders: AppointmentOrderOutput[];

  @Expose()
  sameInterpreter: boolean;

  @Exclude()
  matchedInterpreterIds: string[];

  @Exclude()
  rejectedInterpreterIds: string[];

  @Exclude()
  nextRepeatTime: Date;

  @Exclude()
  repeatInterval: ERepeatInterval;

  @Exclude()
  remainingRepeats: number;

  @Exclude()
  notifyAdmin: Date | null;

  @Exclude()
  endSearchTime: Date;

  @Expose()
  operatedByCompanyName: string;

  @Exclude()
  operatedByCompanyId: string;

  @Exclude()
  timeToRestart: Date | null;

  @Exclude()
  isFirstSearchCompleted: boolean;

  @Exclude()
  isSecondSearchCompleted: boolean;

  @Exclude()
  isSearchNeeded: boolean;

  @Exclude()
  isCompanyHasInterpreters: boolean;

  @Exclude()
  acceptOvertimeRates: boolean;

  @Exclude()
  timezone: string;

  @Expose()
  creationDate: Date;

  @Expose()
  updatingDate: Date;
}
