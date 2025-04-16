import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const chimeMeetingConfiguration: IMethodSeed = {
  "GET /v1/chime/meetings/info-config/:appointmentId": {
    description: "01. Get config and attendees by appointment id",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/join-admin/:appointmentId": {
    description: "02. Join to meeting as super-admin",
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
  "GET /v1/chime/meetings/join/:appointmentId": {
    description: "03. Join to meeting as internal user",
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
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/join-external/:id": {
    description: "04. Join to meeting as external user",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/:chimeMeetingId/attendees/:attendeeId": {
    description: "05. Get attendee and details",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/chime/meetings/batch-update-attendees-capabilities/:chimeMeetingId": {
    description: "06. Update all attendee capabilities as super-admin",
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
  "PATCH /v1/chime/meetings/update-attendee-capabilities/:chimeMeetingId": {
    description: "07. Update attendee capabilities",
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
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/chime/meetings/:chimeMeetingId/attendees/:attendeeId": {
    description: "08. Disable attendee in meeting",
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
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/add-extra-attendee/:chimeMeetingId": {
    description: "09. Add extra attendee in live meeting",
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
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/receptionist-call/:chimeMeetingId": {
    description: "10. Receptionist call",
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
  "POST /v1/chime/meetings/:chimeMeetingId/direct-call-to-participants/:attendeeId": {
    description: "11. Direct call to participant",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/background-call-to-client/:chimeMeetingId": {
    description: "12. Background call to client",
    roles: {
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
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/background-call-to-interpreter/:chimeMeetingId": {
    description: "13. Background call to interpreter",
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
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/background-call-for-external-participants/:chimeMeetingId": {
    description: "14. Background call for all external participants",
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
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/clients-call-for-any-external-participants/:chimeMeetingId": {
    description: "15. Background call for any external participants",
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
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/leave/:id/:attendeeId": {
    description: "16. Leave meeting",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/close/:chimeMeetingId": {
    description: "17. Close meeting",
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
    isNotEditableForOtherRoles: true,
  },
};
