import { EUserRoleName } from "src/modules/roles/common/enums";
import { EAppointmentType, EInterpreterAppointmentCriteria } from "src/modules/statistics/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/common/enums";
import { IAppointmentTypeCriteria } from "src/modules/statistics/common/interfaces";

export const ADMIN_STATISTICS_ALLOWED_ROLES: EUserRoleName[] = [
  EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
  EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
  EUserRoleName.IND_CLIENT,
  EUserRoleName.CORPORATE_CLIENTS_IND_USER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
];

export const ADMIN_STATISTICS_ALLOWED_VALUES = [...ADMIN_STATISTICS_ALLOWED_ROLES, "all"];

export const ADMIN_STATISTICS_ALLOWED_INTERPRETERS_ROLES: EUserRoleName[] = [
  EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
  EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
];

export const ADMIN_STATISTICS_ALLOWED_INTERPRETERS_VALUES = [...ADMIN_STATISTICS_ALLOWED_INTERPRETERS_ROLES, "all"];

export const ADMIN_INTERPRETER_CRITERIA = [
  EInterpreterAppointmentCriteria.AT_LEAST_ONE_COMPLETED_APPOINTMENT_PER_DAY,
  EInterpreterAppointmentCriteria.AT_LEAST_3_COMPLETED_APPOINTMENT_PER_DAY,
  EInterpreterAppointmentCriteria.AT_LEAST_5_COMPLETED_APPOINTMENT_PER_DAY,
  EInterpreterAppointmentCriteria.AT_LEAST_10_COMPLETED_APPOINTMENT_PER_DAY,
];

export const APPOINTMENT_TYPE_CRITERIA: {
  [key in EAppointmentType]: IAppointmentTypeCriteria;
} = {
  [EAppointmentType.ALL]: {
    communicationType: undefined,
    schedulingType: undefined,
  },
  [EAppointmentType.AUDIO_ON_DEMAND]: {
    communicationType: EAppointmentCommunicationType.AUDIO,
    schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  },
  [EAppointmentType.VIDEO_ON_DEMAND]: {
    communicationType: EAppointmentCommunicationType.VIDEO,
    schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  },
  [EAppointmentType.F2F_ON_DEMAND]: {
    communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
    schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  },
  [EAppointmentType.AUDIO_PRE_BOOKED]: {
    communicationType: EAppointmentCommunicationType.AUDIO,
    schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  },
  [EAppointmentType.VIDEO_PRE_BOOKED]: {
    communicationType: EAppointmentCommunicationType.VIDEO,
    schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  },
  [EAppointmentType.F2F_PRE_BOOKED]: {
    communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
    schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  },
};

export const APPOINTMENT_INTERPRETING_CRITERIA: {
  all?: undefined;
} & {
  [key in EAppointmentInterpretingType]?: EAppointmentInterpretingType;
} = {
  all: undefined,
  [EAppointmentInterpretingType.CONSECUTIVE]: EAppointmentInterpretingType.CONSECUTIVE,
  [EAppointmentInterpretingType.SIMULTANEOUS]: EAppointmentInterpretingType.SIMULTANEOUS,
  [EAppointmentInterpretingType.SIGN_LANGUAGE]: EAppointmentInterpretingType.SIGN_LANGUAGE,
  [EAppointmentInterpretingType.ESCORT]: EAppointmentInterpretingType.ESCORT,
};

export const ROLES_WHICH_CAN_CANCEL_APPOINTMENT: EUserRoleName[] = [
  EUserRoleName.SUPER_ADMIN,
  EUserRoleName.LFH_BOOKING_OFFICER,
  EUserRoleName.IND_CLIENT,
  EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_RECEPTIONIST,
  EUserRoleName.CORPORATE_CLIENTS_IND_USER,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_RECEPTIONIST,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_RECEPTIONIST,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
];

export const ROLES_WHICH_CAN_CANCEL_APPOINTMENT_WITH_ALL = ["all", ...ROLES_WHICH_CAN_CANCEL_APPOINTMENT];
