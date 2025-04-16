import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const interpreterBadge: IMethodSeed = {
  "PATCH /v1/interpreter-profile/badge": {
    description: "01. Create or update interpreter badge.",
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
};
