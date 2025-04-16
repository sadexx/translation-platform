export enum ECompanyEmployeesNumber {
  ZERO_TO_TEN = "0-10",
  ELEVEN_TO_FIFTY = "11-50",
  FIFTY_ONE_TO_ONE_HUNDRED = "51-100",
  ONE_HUNDRED_TO_EIGHT_HUNDRED = "101-800",
  MORE_THEN_EIGHT_HUNDRED = "more-than-800",
}

export const companyEmployeesNumberOrder: Record<ECompanyEmployeesNumber, number> = {
  [ECompanyEmployeesNumber.ZERO_TO_TEN]: 1,
  [ECompanyEmployeesNumber.ELEVEN_TO_FIFTY]: 2,
  [ECompanyEmployeesNumber.FIFTY_ONE_TO_ONE_HUNDRED]: 3,
  [ECompanyEmployeesNumber.ONE_HUNDRED_TO_EIGHT_HUNDRED]: 4,
  [ECompanyEmployeesNumber.MORE_THEN_EIGHT_HUNDRED]: 5,
};
