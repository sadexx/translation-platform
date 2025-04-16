import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const userAvatars: IMethodSeed = {
  "GET /v1/user-avatars/:id": {
    description: "01. Get request by user id",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/user-avatars/upload": {
    description: "02. Upload avatar",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/user-avatars/manual-decision": {
    description: "03. Avatar manual decision",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/user-avatars/remove": {
    description: "04. Avatar reset",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
};
