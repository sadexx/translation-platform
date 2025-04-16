import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/common/enums";
import { ERateDetailsSequence, ERateDetailsTime, ERateTiming } from "src/modules/rates/common/enums";
import { EUserRoleName } from "src/modules/roles/common/enums";

export const PEAK_HOUR = 18;

export const ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.AUDIO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
};

export const ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
};

export const PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.AUDIO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
};

export const PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
};

export const ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
};

export const PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
};

export const PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
};

export const ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
};

export const PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
};

export const ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
};

export const RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_15_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.FIFTEEN,
};

export const RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS = {
  details: ERateTiming.UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK,
  detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
  detailsTime: ERateDetailsTime.FIVE,
};

export const RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_30_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.THIRTY,
};

export const RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_90_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.NINETY,
};

export const RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS = {
  details: ERateTiming.UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK,
  detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
  detailsTime: ERateDetailsTime.TEN,
};

export const RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_120_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.TWO_HOURS,
};

export const RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS = {
  details: ERateTiming.UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK,
  detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
  detailsTime: ERateDetailsTime.OHE_HOUR,
};

export const RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_60_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.OHE_HOUR,
};

export const RATE_SELECT_ROLES_FOR_ALL_FIELDS = [EUserRoleName.SUPER_ADMIN, EUserRoleName.LFH_BOOKING_OFFICER];
export const RATE_SELECT_ROLES_FOR_TAKER_FIELDS = [
  EUserRoleName.IND_CLIENT,
  EUserRoleName.INVITED_GUEST,
  EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_RECEPTIONIST,
  EUserRoleName.CORPORATE_CLIENTS_IND_USER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_RECEPTIONIST,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_RECEPTIONIST,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
];
export const RATE_SELECT_ROLES_FOR_INTERPRETER_FIELDS = [
  EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
  EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
];
