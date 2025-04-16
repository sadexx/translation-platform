export enum EInterpreterCertificateType {
  NAATI = "naati",
  IELTS = "ielts",
  OTHER = "other",
}

export const interpreterCertificateTypeOrder: Record<EInterpreterCertificateType, number> = {
  [EInterpreterCertificateType.NAATI]: 1,
  [EInterpreterCertificateType.IELTS]: 2,
  [EInterpreterCertificateType.OTHER]: 3,
};
