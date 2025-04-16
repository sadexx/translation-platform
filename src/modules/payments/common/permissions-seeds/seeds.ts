import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const payments: IMethodSeed = {
  "POST /v1/payments/manual-payout-attempt": {
    description: "01.01. Make manual payout attempt",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/payments/get-individual-payments-list": {
    description: "02.01. Get individual payments list",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/payments/download-receipt-by-user": {
    description: "03.01. Download receipt by key",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
