import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const sumsub: IMethodSeed = {
  "GET /v1/sumsub/access-token": {
    description: "01. Get access token",
    roles: {
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/sumsub/all-status-checks": {
    description: "02. Get all status checks",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/sumsub/user-status": {
    description: "03. Get user status",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/sumsub/mock": {
    description: "04. Mock sumsub for current user",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/sumsub": {
    description: "05. Update sumsub check",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/sumsub": {
    description: "06. Delete sumsub check",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
