import { CompanyAdminRole } from "src/modules/companies/common/enums";

export interface ICreateCompanyAdminData {
  role: CompanyAdminRole;
  email: string;
}
