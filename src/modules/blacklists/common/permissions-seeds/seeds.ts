import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const blacklists: IMethodSeed = {
  "POST /v1/blacklists/:id": {
    description: "01. Create blacklist",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/blacklists/:id": {
    description: "02. Update blacklist",
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
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/blacklists/:id": {
    description: "03. Delete blacklist",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
