import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const docusign: IMethodSeed = {
  "GET /v1/docusign/callback": {
    description: "01.01. Callback for docusign auth system",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/docusign/contracts": {
    description: "01.02. Get contracts list",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/docusign/envelope-document": {
    description: "01.03. Get link to envelope document",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/docusign/resend-contract": {
    description: "01.04. Resend contract",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/docusign/download-contract": {
    description: "01.05. Get link for download contract",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
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
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-clients-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/docusign/corporate/fill-corporate-signers": {
    description: "02.01. Fill company contract signers",
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
  "DELETE /v1/docusign/corporate/remove-second-corporate-signer": {
    description: "02.02. Remove second company contract signer",
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
  "GET /v1/docusign/corporate/get-corporate-signers": {
    description: "02.03. Get company contract signers",
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
  "POST /v1/docusign/corporate/create-and-send-corporate-contract": {
    description: "02.04. Create and send company contract",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/docusign/corporate/create-corporate-contract": {
    description: "02.05. Create company contract",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/docusign/corporate/send-corporate-contract": {
    description: "02.06. Fill and send company contract",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/docusign/corporate/resend-contract": {
    description: "02.07. Resend company contract",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/docusign/corporate/get-contract-edit-link": {
    description: "02.08. Get company contract edit link",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
