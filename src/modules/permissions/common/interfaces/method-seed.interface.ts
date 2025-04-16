export interface IMethodSeed {
  [endpoint: string]: {
    description: string;
    roles: {
      [role: string]: {
        isAllowed: boolean;
        isEditable?: boolean;
      };
    };
    isNotEditableForOtherRoles: boolean;
  };
}
