import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const appointmentsOrder: IMethodSeed = {
  "POST /v1/appointment-orders/command/accept/:id": {
    description: "01.01. Accept appointment order",
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
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointment-orders/command/accept/on-demand/:id": {
    description: "01.02. Accept on-demand appointment order",
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
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointment-orders/command/group/accept/:id": {
    description: "01.03. Accept appointment order group",
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
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/appointment-orders/command/reject/:id": {
    description: "01.04. Reject appointment order",
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
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/appointment-orders/command/group/reject/:id": {
    description: "01.05. Reject appointment order group",
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
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/appointment-orders/command/refuse/:id": {
    description: "01.06. Refuse appointment order",
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
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/appointment-orders/command/group/refuse/:id": {
    description: "01.07. Refuse appointment order group",
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
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointment-orders/command/send-repeat-notification-to-interpreters/:id": {
    description: "01.08. Send repeat notification to interpreters",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointment-orders/command/group/send-repeat-notification-to-interpreters/:platformId": {
    description: "01.09. Send repeat notification to interpreters",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointment-orders/command/add-interpreter-to-order/:id": {
    description: "01.10. Manually add interpreter to order",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointment-orders/command/group/add-interpreter-to-order-group/:platformId": {
    description: "01.11. Manually add interpreter to order group",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },

  "GET /v1/appointment-orders/query/company": {
    description: "02.01. Get all orders by company.",
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
  "GET /v1/appointment-orders/query/matched": {
    description: "02.02. Get all matched orders",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
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
  "GET /v1/appointment-orders/query/rejected": {
    description: "02.03. Get all rejected orders",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
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
  "GET /v1/appointment-orders/query/:id": {
    description: "02.04. Get appointment order by id",
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
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/appointment-orders/query/group/:id": {
    description: "02.05. Get appointment order group by id",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
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
  "GET /v1/appointment-orders/query/list-of-interpreters-received-order/:id": {
    description: "02.06. Get list of interpreters received order",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/appointment-orders/query/group/list-of-interpreters-received-order/:platformId": {
    description: "02.07. Get list of interpreters received order group",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
