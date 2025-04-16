import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const archiveAudioRecords: IMethodSeed = {
  "GET /v1/archive-audio-records/:id": {
    description: "01.01. Get audio recording by appointment admin info id",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
