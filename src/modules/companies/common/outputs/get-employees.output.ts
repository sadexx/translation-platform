import { UserRole } from "src/modules/users-roles/entities";
import { PaginationOutput } from "src/common/outputs";

export class GetEmployeesOutput extends PaginationOutput {
  data: UserRole[];
}
