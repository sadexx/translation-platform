export enum EAccountStatus {
  ACTIVE = "active",
  INVITATION_LINK = "invitation-link",
  DEACTIVATED = "deactivated",
  REGISTERED = "registered",
}

export const accountStatusOrder: Record<EAccountStatus, number> = {
  [EAccountStatus.ACTIVE]: 1,
  [EAccountStatus.REGISTERED]: 2,
  [EAccountStatus.INVITATION_LINK]: 3,
  [EAccountStatus.DEACTIVATED]: 4,
};
