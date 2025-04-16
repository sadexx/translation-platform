import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const concessionCard: IMethodSeed = {
  "POST /v1/concession-card": {
    description: "01. Create concession card",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/concession-card/upload-docs": {
    description: "02. Upload document to concession card",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/concession-card": {
    description: "03. Update concession card",
    roles: {
      "super-admin": {
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
  "GET /v1/concession-card": {
    description: "04. Get concession card",
    roles: {
      "super-admin": {
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
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/concession-card/manual-decision": {
    description: "05. Change concession card status",
    roles: {
      "super-admin": {
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
  "DELETE /v1/concession-card": {
    description: "06. Delete concession card",
    roles: {
      "super-admin": {
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
  "DELETE /v1/concession-card/remove-file": {
    description: "07. Delete concession card file",
    roles: {
      "super-admin": {
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
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
