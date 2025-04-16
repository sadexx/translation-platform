import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const reviews: IMethodSeed = {
  "POST /v1/reviews": {
    description: "01. Create review",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/reviews/:id": {
    description: "02. Get review by id",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/reviews/:id": {
    description: "03. Update review by id",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/reviews/:id": {
    description: "04. Delete review by id",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
