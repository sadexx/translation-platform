import { IGetMyCompany } from "src/modules/companies/common/interfaces";
import { PaginationOutput } from "src/common/outputs";

export class GetCompaniesOutput extends PaginationOutput {
  data: IGetMyCompany[];
}
