import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const promoCampaigns: IMethodSeed = {
  "GET /v1/promo-campaigns/personal": {
    description: "01. Get personal promo campaigns",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/promo-campaigns/corporate": {
    description: "02. Get corporate promo campaigns",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/promo-campaigns/personal": {
    description: "03. Create personal regular promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/promo-campaigns/personal/mixed": {
    description: "03. Create personal mixed promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/promo-campaigns/corporate": {
    description: "04. Create corporate regular promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/promo-campaigns/corporate/mixed": {
    description: "04. Create corporate mixed promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/promo-campaigns/assign": {
    description: "05. Assign personal promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/promo-campaigns/unassign": {
    description: "06. Unassign personal promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/promo-campaigns/toggle-status/:id": {
    description: "07. Toggle promo campaign status",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/promo-campaigns/:id": {
    description: "08. Remove promo campaign",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
