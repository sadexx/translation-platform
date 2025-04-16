export const allRolesAllowedAndNotEditable = {
  "super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "lfh-booking-officer": {
    isAllowed: true,
    isEditable: false,
  },
  "ind-client": {
    isAllowed: true,
    isEditable: false,
  },
  "ind-professional-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
  "ind-language-buddy-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
  "invited-guest": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-receptionist": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-ind-user": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-receptionist": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-ind-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-receptionist": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-ind-user": {
    isAllowed: true,
    isEditable: false,
  },
};

export const ENDPOINTS_WITHOUT_SEEDS: string[] = [
  "GET /v1/health-check",
  "GET /v1/chime/meetings/test/:meetingId",
  "POST /v1/chime/meetings/test/join/:meetingId",
  "POST /v1/chime/meetings/test",
  "DELETE /v1/chime/meetings/test/:meetingId",
  "GET /v1/chime/meetings/test/:meetingId/attendees",
  "GET /v1/chime/meetings/test/:meetingId/attendees/:attendeeId",
  "POST /v1/chime/meetings/test/:meetingId/attendees",
  "POST /v1/chime/meetings/test/:meetingId/attendees/:attendeeId",
  "DELETE /v1/chime/meetings/test/:meetingId/attendees/:attendeeId",
  "GET /v1/order-search-engine",
  "POST /v1/developer/register-lfh-super-admin",
  "POST /v1/developer/create-company",
  "GET /v1/payments/download-receipt",
  "POST /v1/rates/calculate-price",
  "GET /v1/payment-information/mock-payment-info",
];
