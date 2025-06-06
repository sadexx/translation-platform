import { EUserRoleName } from "src/modules/roles/common/enums";
import { EAccountStatus } from "src/modules/users-roles/common/enums";

export const ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING: EAccountStatus[] = [
  EAccountStatus.INVITATION_LINK,
  EAccountStatus.REGISTERED,
];

export const INDIVIDUAL_ROLES: EUserRoleName[] = [
  EUserRoleName.IND_CLIENT,
  EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER,
  EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
];

export const LFH_PERSONAL_ROLES: EUserRoleName[] = [EUserRoleName.SUPER_ADMIN, EUserRoleName.LFH_BOOKING_OFFICER];

export const COMPANY_LFH_ID: string = "df5b18c0-c440-4ba0-ba21-bbf6aeec6d4e";
export const COMPANY_LFH_NAME: string = "LFH";
export const COMPANY_LFH_FULL_NAME: string = "Lingua Franca Hub Pty Ltd";
export const RESTRICTED_COMPANY_NAMES = [COMPANY_LFH_NAME, COMPANY_LFH_FULL_NAME];

/*
 * ALLOWED COMPANY EMPLOYEE ROLES
 */

export const ALLOWED_CORPORATE_CLIENTS_EMPLOYEE_ROLES: EUserRoleName[] = [
  EUserRoleName.CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_RECEPTIONIST,
  EUserRoleName.CORPORATE_CLIENTS_IND_USER,
];

export const ALLOWED_CORPORATE_INTERPRETING_PROVIDERS_EMPLOYEE_ROLES: EUserRoleName[] = [
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_RECEPTIONIST,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
];

export const ALLOWED_CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_EMPLOYEE_ROLES: EUserRoleName[] = [
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_RECEPTIONIST,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER,
];

export const ALLOWED_EMPLOYEE_ROLES: EUserRoleName[] = [
  ...ALLOWED_CORPORATE_CLIENTS_EMPLOYEE_ROLES,
  ...ALLOWED_CORPORATE_INTERPRETING_PROVIDERS_EMPLOYEE_ROLES,
  ...ALLOWED_CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_EMPLOYEE_ROLES,
];

/*
 * COMPANY PERSONAL ROLES
 */

export const CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES: EUserRoleName[] = [
  EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_CLIENTS_RECEPTIONIST,
];

export const CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES: EUserRoleName[] = [
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_RECEPTIONIST,
];

export const CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES: EUserRoleName[] = [
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_ADMIN,
  EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_RECEPTIONIST,
];

export const COMPANY_PERSONAL_ROLES: EUserRoleName[] = [
  ...CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES,
  ...CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES,
  ...CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES,
];
