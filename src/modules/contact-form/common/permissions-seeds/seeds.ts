import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants/constants";

export const contactForm: IMethodSeed = {
  "POST /v1/contact-forms": {
    description: "01. Create contact form",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/contact-forms": {
    description: "02. Get contact forms",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/contact-forms/set-viewed/:id": {
    description: "03. Set viewed contact form.",
    roles: {
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
