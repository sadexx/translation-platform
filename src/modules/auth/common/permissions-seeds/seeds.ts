import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const auth: IMethodSeed = {
  "POST /v1/auth/login": {
    description: "01. Login",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/login/select-role": {
    description: "02. Select role (if user have multiple roles)",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/login/change-role": {
    description: "03. Change role (if user have multiple roles)",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/refresh-tokens": {
    description: "04. Refresh tokens",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/logout": {
    description: "06. Logout",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/auth/google": {
    description: "07. Google auth",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/auth/google-redirect": {
    description: "08. Redirect for google",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/google-mobile": {
    description: "08. Google auth from mobile",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/auth/apple": {
    description: "09. Apple auth",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/apple-redirect": {
    description: "10. Redirect for apple",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/auth/apple-mobile": {
    description: "11. Apple auth from mobile",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/start-registration": {
    description: "01. Start registration",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/start-new-role-registration": {
    description: "02. Start new role registration",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/verify-email": {
    description: "03. Verify email",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/create-password": {
    description: "04. Create password",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/add-phone": {
    description: "05. Add phone",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/verify-phone": {
    description: "06. Verify phone",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/conditions-agreement": {
    description: "07. Apply conditions agreement",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/registration/steps": {
    description: "08. Get registration steps",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/finish-registration": {
    description: "09. Finish registration",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration/super-admin-registration": {
    description: "10. Super admin registration",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration-link": {
    description: "01. Send registration link to user",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/registration-link/resend": {
    description: "02. Resend registration link to user",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/registration-link/delete-by-id/:id": {
    description: "03. Delete registration link by id",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
