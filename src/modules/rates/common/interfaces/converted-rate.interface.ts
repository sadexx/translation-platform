import { ERateDetailsSequence, ERateDetailsTime, ERateQualifier, ERateTiming } from "src/modules/rates/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/common/enums";

export interface IConvertedRate {
  id: string;
  quantity: number;
  interpreterType: EAppointmentInterpreterType;
  schedulingType: EAppointmentSchedulingType;
  communicationType: EAppointmentCommunicationType;
  interpretingType: EAppointmentInterpretingType;
  qualifier: ERateQualifier;
  details: ERateTiming;
  detailsSequence: ERateDetailsSequence;
  detailsTime: ERateDetailsTime;
  paidByTakerGeneralWithGst: number;
  paidByTakerGeneralWithoutGst: number;
  paidByTakerSpecialWithGst: number | null;
  paidByTakerSpecialWithoutGst: number | null;
  lfhCommissionGeneral: number;
  lfhCommissionSpecial: number | null;
  paidToInterpreterGeneralWithGst: number;
  paidToInterpreterGeneralWithoutGst: number;
  paidToInterpreterSpecialWithGst: number | null;
  paidToInterpreterSpecialWithoutGst: number | null;
  creationDate: Date;
  updatingDate: Date;
}
