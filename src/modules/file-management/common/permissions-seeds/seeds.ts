import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const fileManagement: IMethodSeed = {
  "POST /v1/file-management/upload-terms": {
    description: "01. Upload terms",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/file-management/download-terms": {
    description: "02. Download terms",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
};
