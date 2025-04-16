import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const languageDocCheck: IMethodSeed = {
  "POST /v1/language-doc-check": {
    description: "01. Create request",
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
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/language-doc-check/upload-docs": {
    description: "02. Upload document to request",
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
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/language-doc-check": {
    description: "03. Update request",
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
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/language-doc-check": {
    description: "04. Get request",
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
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/language-doc-check/manual-decision": {
    description: "05. Change request status",
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
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/language-doc-check": {
    description: "06. Delete request",
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
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/language-doc-check/remove-file": {
    description: "07. Delete file from request",
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
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
