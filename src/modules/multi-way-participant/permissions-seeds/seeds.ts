import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const multiWayParticipants: IMethodSeed = {
  "POST /v1/multi-way-participants/appointment/add-participant/:id": {
    description: "01.01. Add participant to appointment",
    roles: {
      "super-admin": {
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
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-clients-receptionist": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/multi-way-participants/:id": {
    description: "01.02. Update participant",
    roles: {
      "super-admin": {
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
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-clients-receptionist": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/multi-way-participants/:id": {
    description: "01.03. Delete participant",
    roles: {
      "super-admin": {
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
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-clients-receptionist": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
