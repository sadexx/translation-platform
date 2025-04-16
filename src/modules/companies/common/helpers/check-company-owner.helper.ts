import { ECompanyType } from "src/modules/companies/common/enums";
import { CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES } from "src/modules/companies/common/constants/constants";
import { ForbiddenException } from "@nestjs/common";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

export function checkCompanyOwnerHelper(
  company: Company,
  user: ITokenUserData,
  admin: UserRole,
  userRole: UserRole,
): void {
  if (
    company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
    CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES.includes(user.role)
  ) {
    if (company.operatedBy !== admin.operatedByCompanyId) {
      throw new ForbiddenException("Forbidden request!");
    }
  } else {
    if (userRole.operatedByCompanyId !== admin.operatedByCompanyId) {
      throw new ForbiddenException("Forbidden request!");
    }
  }
}
