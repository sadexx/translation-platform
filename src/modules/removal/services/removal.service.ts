import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Company } from "src/modules/companies/entities";
import { DeleteResult, LessThanOrEqual, Repository } from "typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { subDays } from "date-fns";
import { HelperService } from "src/modules/helper/services";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { COMPANY_SUPER_ADMIN_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class RemovalService {
  private readonly lokiLogger = new LokiLogger(RemovalService.name);
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly helperService: HelperService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
  ) {}

  public async deleteUserRoles(): Promise<void> {
    const usersRoles = await this.userRoleRepository.find({
      where: { isInDeleteWaiting: true, deletingDate: LessThanOrEqual(new Date()) },
      relations: {
        address: true,
        profile: true,
        interpreterProfile: true,
        user: {
          userRoles: {
            role: true,
            address: true,
            profile: true,
          },
          administratedCompany: {
            superAdmin: {
              userRoles: {
                role: true,
              },
            },
          },
        },
      },
    });

    this.lokiLogger.log(`Cron autoRemovingUserRoles, count of deleting users or userRoles: ${usersRoles.length}`);

    let successfullyDeleted: number = 0;
    let deletedWithError: number = 0;

    for (const userRole of usersRoles) {
      try {
        if (userRole.user.administratedCompany) {
          await this.deleteCompany(userRole.user.administratedCompany);
        } else {
          if (userRole.user.userRoles.length > 1) {
            await this.userRoleRepository.delete({ id: userRole.id });
          } else {
            await this.userRepository.delete({ id: userRole.userId });
          }
        }

        if (userRole.interpreterProfile?.interpreterBadgePdf) {
          await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole);
        }

        successfullyDeleted++;
      } catch (error) {
        this.lokiLogger.error(
          `Failed to delete userRole ${userRole.id} (userId: ${userRole.userId})`,
          (error as Error).stack,
        );
        deletedWithError++;
      }
    }

    if (usersRoles.length > 0) {
      this.lokiLogger.log(`Cron autoRemovingUserRoles success: ${successfullyDeleted}, errors: ${deletedWithError}`);
    }

    return;
  }

  public async deleteUnfinishedRegistrationUserRoles(): Promise<void> {
    const INACTIVE_DAYS_LIMIT = 30;
    const registrationExpiryDate = subDays(new Date(), INACTIVE_DAYS_LIMIT);

    const userRolesToDelete = await this.userRoleRepository.find({
      where: {
        isRegistrationFinished: false,
        creationDate: LessThanOrEqual(registrationExpiryDate),
      },
      relations: {
        interpreterProfile: true,
        user: {
          userRoles: true,
          administratedCompany: {
            superAdmin: {
              userRoles: {
                role: true,
              },
            },
          },
        },
      },
    });

    this.lokiLogger.log(
      `Cron deleteUnfinishedRegistrationUserRoles, found ${userRolesToDelete.length} roles for deletion.`,
    );

    let successfullyDeleted: number = 0;
    let deletedWithError: number = 0;

    for (const userRole of userRolesToDelete) {
      try {
        if (userRole.user.administratedCompany) {
          await this.deleteCompany(userRole.user.administratedCompany);
        } else {
          if (userRole.user.userRoles.length > 1) {
            await this.userRoleRepository.delete({ id: userRole.id });
          } else {
            await this.userRepository.delete({ id: userRole.userId });
          }
        }

        if (userRole.interpreterProfile?.interpreterBadgePdf) {
          await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole);
        }

        successfullyDeleted++;
      } catch (error) {
        this.lokiLogger.error(
          `Failed to delete userRole ${userRole.id} (userId: ${userRole.user.id})`,
          (error as Error).stack,
        );
        deletedWithError++;
      }
    }

    if (userRolesToDelete.length > 0) {
      this.lokiLogger.log(
        `Cron deleteUnfinishedRegistrationUserRoles success: ${successfullyDeleted}, errors: ${deletedWithError}`,
      );
    }

    return;
  }

  public async deleteCompanies(): Promise<void> {
    const companies = await this.companyRepository.find({
      where: { isInDeleteWaiting: true, deletingDate: LessThanOrEqual(new Date()) },
      relations: {
        superAdmin: {
          userRoles: {
            role: true,
          },
        },
      },
    });

    for (const company of companies) {
      await this.deleteCompany(company);
    }

    return;
  }

  public async deleteCompany(company: Company): Promise<void> {
    const deletePromises: Promise<DeleteResult>[] = [];

    await this.companyRepository.delete({ id: company.id });

    if (company.removeAllAdminRoles) {
      deletePromises.push(this.userRepository.delete({ id: company.superAdminId }));
    }

    if (!company.removeAllAdminRoles) {
      if (company.superAdmin.userRoles.length <= 1) {
        deletePromises.push(this.userRepository.delete({ id: company.superAdminId }));
      }

      if (company.superAdmin.userRoles.length > 1) {
        const superAdminRole = await this.helperService.getUserRoleByName(
          company.superAdmin,
          COMPANY_SUPER_ADMIN_ROLES,
        );
        deletePromises.push(this.userRoleRepository.delete({ id: superAdminRole.id }));
      }
    }

    const companyEmployees = await this.userRoleRepository.find({
      where: { operatedByCompanyId: company.id },
      relations: { user: { userRoles: true }, interpreterProfile: true },
    });

    for (const employee of companyEmployees) {
      if (employee.user.userRoles.length > 1) {
        deletePromises.push(this.userRoleRepository.delete({ id: employee.id }));
      }

      if (employee.user.userRoles.length <= 1) {
        deletePromises.push(this.userRepository.delete({ id: employee.userId }));
      }

      if (employee.interpreterProfile?.interpreterBadgePdf) {
        await this.interpreterBadgeService.removeInterpreterBadgePdf(employee);
      }
    }

    this.lokiLogger.log(
      `Cron autoRemovingCompanies, count of deleting users or userRoles for company ${company.id}: ${deletePromises.length}`,
    );

    const resolvedPromises = (await Promise.allSettled(deletePromises))
      .filter(
        (settledPromise): settledPromise is PromiseFulfilledResult<DeleteResult> =>
          settledPromise.status === "fulfilled",
      )
      .map((fulfilledPromise) => fulfilledPromise.value);

    if (deletePromises.length > 0) {
      this.lokiLogger.log(
        `Cron autoRemovingCompanies, count of deleted users or userRoles with success: ${resolvedPromises.length}`,
      );
      this.lokiLogger.log(
        `Cron autoRemovingCompanies, count of deleted users or userRoles with error: ${deletePromises.length - resolvedPromises.length}`,
      );
    }
  }
}
