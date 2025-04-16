export enum ECompanyStatus {
  NEW_REQUEST = "new-request",
  INVITATION_LINK_SENT = "invitation-link-was-sent",
  REGISTERED = "registered",
  UNDER_REVIEW = "under-review",
  ACTIVE = "active",
  DEACTIVATED = "deactivated",
}

export const companyStatusOrder: Record<ECompanyStatus, number> = {
  [ECompanyStatus.ACTIVE]: 1,
  [ECompanyStatus.NEW_REQUEST]: 2,
  [ECompanyStatus.REGISTERED]: 3,
  [ECompanyStatus.INVITATION_LINK_SENT]: 4,
  [ECompanyStatus.UNDER_REVIEW]: 5,
  [ECompanyStatus.DEACTIVATED]: 6,
};
