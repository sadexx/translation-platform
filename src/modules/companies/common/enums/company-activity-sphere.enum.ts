export enum ECompanyActivitySphere {
  EDUCATION = "education",
  GOVERNMENT = "government",
  HEALTHCARE = "healthcare",
  LANGUAGE_SERVICE_COMPANY = "language-service-company",
  LEGAL_AND_JUDICIAL = "legal-and-judicial",
  BUSINESS = "business",
  OTHER = "other",
}

export const companyActivitySphereOrder: Record<ECompanyActivitySphere, number> = {
  [ECompanyActivitySphere.EDUCATION]: 1,
  [ECompanyActivitySphere.GOVERNMENT]: 2,
  [ECompanyActivitySphere.HEALTHCARE]: 3,
  [ECompanyActivitySphere.LANGUAGE_SERVICE_COMPANY]: 4,
  [ECompanyActivitySphere.LEGAL_AND_JUDICIAL]: 5,
  [ECompanyActivitySphere.BUSINESS]: 6,
  [ECompanyActivitySphere.OTHER]: 7,
};
