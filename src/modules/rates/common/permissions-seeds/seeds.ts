import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const rates: IMethodSeed = {
  "POST /v1/rates/generate-rate-table": {
    description: "01. Generate rate table",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/rates/update-rate-table": {
    description: "02. Update rate table",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/rates/get-rate-table": {
    description: "03. Get rate table",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
};
