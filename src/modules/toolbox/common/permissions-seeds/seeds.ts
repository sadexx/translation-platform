import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const toolbox: IMethodSeed = {
  "GET /v1/toolbox/language-availability": {
    description: "01. Get unique languages on system.",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/toolbox/companies-dropdown-information": {
    description: "02. Get companies information for dropdown.",
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
  "GET /v1/toolbox/users-dropdown-information": {
    description: "03. Get users information for dropdown.",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-clients-receptionist": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-receptionist": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/toolbox/interpreters-availability": {
    description: "04. Get interpreters availability counts.",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
