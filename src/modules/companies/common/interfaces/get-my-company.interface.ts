import { Company } from "src/modules/companies/entities";

export interface IGetMyCompany extends Company {
  operatedByPlatformId?: string;
  operatedByCompanyName?: string;
}
