import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, IsNull, Repository } from "typeorm";
import { Statistic } from "src/modules/statistics/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { EAppointmentType, EChartLine, EStatisticType } from "src/modules/statistics/common/enums";
import { Appointment } from "src/modules/appointments/entities";
import { EAppointmentInterpretingType, EAppointmentStatus } from "src/modules/appointments/common/enums";
import {
  ADMIN_INTERPRETER_CRITERIA,
  ADMIN_STATISTICS_ALLOWED_INTERPRETERS_ROLES,
  ADMIN_STATISTICS_ALLOWED_ROLES,
  APPOINTMENT_INTERPRETING_CRITERIA,
  APPOINTMENT_TYPE_CRITERIA,
  ROLES_WHICH_CAN_CANCEL_APPOINTMENT,
} from "src/modules/statistics/common/constants/constants";
import {
  NUMBER_OF_HOURS_IN_DAY,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";
import { ConfigService } from "@nestjs/config";
import { StatisticsService } from "src/modules/statistics/services";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class FillStatisticsService {
  private readonly lokiLogger = new LokiLogger(FillStatisticsService.name);

  constructor(
    @InjectRepository(Statistic)
    private readonly statisticRepository: Repository<Statistic>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly configService: ConfigService,
    private readonly statisticsService: StatisticsService,
  ) {}

  public async fillRegisteredActiveAndInactiveAccounts(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      let registeredAccountsCountAllRoles = 0;
      let activeAccountsCountAllRoles = 0;

      for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
        const registeredAccountsCount: number = await this.userRoleRepository.count({
          where: { accountStatus: EAccountStatus.ACTIVE, role: { name: roleName } },
        });

        registeredAccountsCountAllRoles += registeredAccountsCount;

        const newRegisteredAccountsStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.REGISTERED_USERS,
          value: registeredAccountsCount,
          userRoleName: roleName,
          date: endPeriod,
          statisticType,
        });

        await this.statisticRepository.save(newRegisteredAccountsStatisticRecord);

        const activesUsersCount: [{ active_user_roles: string }] = (await this.appointmentRepository.query(
          "SELECT COUNT(DISTINCT user_roles.id) AS active_user_roles " +
            "FROM appointments " +
            "JOIN user_roles ON (appointments.client_id = user_roles.id OR appointments.interpreter_id = user_roles.id) " +
            "JOIN roles ON (user_roles.role_id = roles.id) " +
            `WHERE appointments.status IN ('${EAppointmentStatus.COMPLETED}', '${EAppointmentStatus.COMPLETED_ACTION_REQUIRED}') ` +
            `AND roles.role = '${roleName}' ` +
            `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}';`,
        )) as [{ active_user_roles: string }];

        activeAccountsCountAllRoles += Number(activesUsersCount[0].active_user_roles);

        const newActiveAccountsStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.ACTIVE_USERS,
          value: Number(activesUsersCount[0].active_user_roles),
          userRoleName: roleName,
          date: endPeriod,
          statisticType,
        });

        await this.statisticRepository.save(newActiveAccountsStatisticRecord);

        const newInactiveAccountsStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.INACTIVE_ACCOUNTS,
          value: registeredAccountsCount - Number(activesUsersCount[0].active_user_roles),
          userRoleName: roleName,
          date: endPeriod,
          statisticType,
        });

        await this.statisticRepository.save(newInactiveAccountsStatisticRecord);
      }

      const newRegisteredAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.REGISTERED_USERS,
        value: registeredAccountsCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newRegisteredAccountsStatisticRecord);

      const newActiveAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.ACTIVE_USERS,
        value: activeAccountsCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newActiveAccountsStatisticRecord);

      const newInactiveAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.INACTIVE_ACCOUNTS,
        value: registeredAccountsCountAllRoles - activeAccountsCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newInactiveAccountsStatisticRecord);
    } catch (error) {
      this.lokiLogger.error(
        `Error in fillRegisteredActiveAndInactiveAccounts: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async fillUnsuccessfulRegistrationAttemptsAccounts(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      let unsuccessfulRegisteredCountAllRoles = 0;

      for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
        const unsuccessfulRegisteredCount: number = await this.userRoleRepository.count({
          where: { profile: IsNull(), role: { name: roleName }, creationDate: Between(startPeriod, endPeriod) },
        });

        unsuccessfulRegisteredCountAllRoles += unsuccessfulRegisteredCount;

        const newUnsuccessfulRegisteredAccountsStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.UNSUCCESSFUL_REGISTRATION,
          value: unsuccessfulRegisteredCount,
          userRoleName: roleName,
          date: endPeriod,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newUnsuccessfulRegisteredAccountsStatisticRecord);
      }

      const newUnsuccessfulRegisteredAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.UNSUCCESSFUL_REGISTRATION,
        value: unsuccessfulRegisteredCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newUnsuccessfulRegisteredAccountsStatisticRecord);
    } catch (error) {
      this.lokiLogger.error(
        `Error in fillUnsuccessfulRegistrationAttemptsAccounts:${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async fillNewRegistrationAccounts(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      let newRegisteredCountAllRoles = 0;

      for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
        const newRegisteredCount: number = await this.userRoleRepository.count({
          where: [
            {
              isRegistrationFinished: true,
              accountStatus: EAccountStatus.REGISTERED,
              role: { name: roleName },
              creationDate: Between(startPeriod, endPeriod),
            },
            {
              isRegistrationFinished: true,
              accountStatus: EAccountStatus.INVITATION_LINK,
              role: { name: roleName },
              creationDate: Between(startPeriod, endPeriod),
            },
          ],
        });

        newRegisteredCountAllRoles += newRegisteredCount;

        const newNewRegisteredAccountsStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.NEW_USER_REGISTRATION,
          value: newRegisteredCount,
          userRoleName: roleName,
          date: endPeriod,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newNewRegisteredAccountsStatisticRecord);
      }

      const newNewRegisteredAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.NEW_USER_REGISTRATION,
        value: newRegisteredCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newNewRegisteredAccountsStatisticRecord);
    } catch (error) {
      this.lokiLogger.error(
        `Error in fillNewRegistrationAccounts: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async fillActiveInterpreters(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      for (const appointmentCount of ADMIN_INTERPRETER_CRITERIA) {
        let activeInterpretersCountAllRoles = 0;

        for (const roleName of ADMIN_STATISTICS_ALLOWED_INTERPRETERS_ROLES) {
          const activeInterpretersCount: [{ active_interpreters_count: string }] =
            (await this.appointmentRepository.query(
              "SELECT COUNT(*) AS active_interpreters_count " +
                "FROM (SELECT user_roles.id " +
                "FROM user_roles " +
                "JOIN appointments ON user_roles.id = appointments.interpreter_id " +
                "JOIN roles ON (user_roles.role_id = roles.id) " +
                `WHERE appointments.status = '${EAppointmentStatus.COMPLETED}' ` +
                `AND roles.role = '${roleName}' ` +
                `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}'` +
                "GROUP BY user_roles.id " +
                `HAVING COUNT(appointments.id) >= ${appointmentCount} ` +
                ") AS subquery;",
            )) as [{ active_interpreters_count: string }];

          activeInterpretersCountAllRoles += Number(activeInterpretersCount[0].active_interpreters_count);

          const newActiveInterpretersStatisticRecord = this.statisticRepository.create({
            chartLine: EChartLine.ACTIVE_INTERPRETERS,
            value: Number(activeInterpretersCount[0].active_interpreters_count),
            userRoleName: roleName,
            date: endPeriod,
            interpreterAppointmentCriteria: appointmentCount,
            statisticType: statisticType,
          });

          await this.statisticRepository.save(newActiveInterpretersStatisticRecord);
        }

        const newActiveInterpretersStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.ACTIVE_INTERPRETERS,
          value: activeInterpretersCountAllRoles,
          userRoleName: "all",
          date: endPeriod,
          interpreterAppointmentCriteria: appointmentCount,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newActiveInterpretersStatisticRecord);
      }
    } catch (error) {
      this.lokiLogger.error(`Error in fillActiveInterpreters: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  public async fillDeletedAccountsDaily(): Promise<void> {
    try {
      let deletedCountAllRoles = 0;

      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date();
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(
        NUMBER_OF_HOURS_IN_DAY - 1,
        NUMBER_OF_MINUTES_IN_HOUR - 1,
        NUMBER_OF_SECONDS_IN_MINUTE - 1,
        NUMBER_OF_MILLISECONDS_IN_SECOND - 1,
      );

      const restoringPeriodInSeconds = this.configService.getOrThrow<number>("jwt.restore.expirationTimeSeconds");
      const deleteRequestDateStart = new Date(
        yesterdayStart.getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND,
      );

      const deleteRequestDateEnd = new Date(
        yesterdayEnd.getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND,
      );

      for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
        const deletedCount: number = await this.userRoleRepository.count({
          where: {
            isInDeleteWaiting: true,
            deletingDate: Between(deleteRequestDateStart, deleteRequestDateEnd),
            role: { name: roleName },
          },
        });

        deletedCountAllRoles += deletedCount;

        const newDeletedStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.DELETED_ACCOUNTS,
          value: deletedCount,
          userRoleName: roleName,
          date: yesterdayStart,
          statisticType: EStatisticType.DAILY,
        });

        await this.statisticRepository.save(newDeletedStatisticRecord);
      }

      const newNewRegisteredAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.DELETED_ACCOUNTS,
        value: deletedCountAllRoles,
        userRoleName: "all",
        date: yesterdayStart,
        statisticType: EStatisticType.DAILY,
      });

      await this.statisticRepository.save(newNewRegisteredAccountsStatisticRecord);
    } catch (error) {
      this.lokiLogger.error(`Error in fillDeletedAccountsDaily: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  public async fillDeletedAccountsByPeriod(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      let deletedCountAllRoles = 0;

      for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
        const deletedCount: [{ total_value: string | null }] = (await this.appointmentRepository.query(
          "SELECT SUM(value) AS total_value " +
            "FROM statistics " +
            `WHERE date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}' ` +
            `AND chart_line = '${EChartLine.DELETED_ACCOUNTS}' ` +
            `AND user_role_name = '${roleName}' ` +
            `AND statistic_type = '${EStatisticType.DAILY}';`,
        )) as [{ total_value: string | null }];

        deletedCountAllRoles += Number(deletedCount[0].total_value);

        const newDeletedStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.DELETED_ACCOUNTS,
          value: Number(deletedCount[0].total_value),
          userRoleName: roleName,
          date: endPeriod,
          statisticType,
        });

        await this.statisticRepository.save(newDeletedStatisticRecord);
      }

      const newDeletedStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.DELETED_ACCOUNTS,
        value: deletedCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newDeletedStatisticRecord);
    } catch (error) {
      this.lokiLogger.error(
        `Error in fillDeletedAccountsByPeriod: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async fillCreatedAndCompletedAppointmentsByType(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      for (const [appointmentTypeName, appointmentTypeCriteria] of Object.entries(APPOINTMENT_TYPE_CRITERIA)) {
        const createdAppointmentCount: number = await this.appointmentRepository.count({
          where: {
            creationDate: Between(startPeriod, endPeriod),
            ...appointmentTypeCriteria,
          },
        });

        const newCreatedAppointmentStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.CREATED_APPOINTMENTS,
          value: createdAppointmentCount,
          date: endPeriod,
          appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newCreatedAppointmentStatisticRecord);

        const completedAppointmentCount: number = await this.appointmentRepository.count({
          where: {
            updatingDate: Between(startPeriod, endPeriod),
            status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
            ...appointmentTypeCriteria,
          },
        });

        const newCompletedAppointmentStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.COMPLETED_APPOINTMENTS,
          value: completedAppointmentCount,
          date: endPeriod,
          appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newCompletedAppointmentStatisticRecord);
      }
    } catch (error) {
      this.lokiLogger.error(
        `Error in fillCreatedAndCompletedAppointmentsByType: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async fillCreatedAndCompletedAppointmentsByInterpretingType(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      for (const [interpretingTypeName, interpretingTypeCriteria] of Object.entries(
        APPOINTMENT_INTERPRETING_CRITERIA,
      )) {
        const createdAppointmentCount: number = await this.appointmentRepository.count({
          where: {
            creationDate: Between(startPeriod, endPeriod),
            interpretingType: interpretingTypeCriteria as EAppointmentInterpretingType,
          },
        });

        const newCreatedAppointmentStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.CREATED_APPOINTMENTS,
          value: createdAppointmentCount,
          date: endPeriod,
          interpretingTypeCriteria: interpretingTypeName,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newCreatedAppointmentStatisticRecord);

        const completedAppointmentCount: number = await this.appointmentRepository.count({
          where: {
            updatingDate: Between(startPeriod, endPeriod),
            status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
            interpretingType: interpretingTypeCriteria as EAppointmentInterpretingType,
          },
        });

        const newCompletedAppointmentStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.COMPLETED_APPOINTMENTS,
          value: completedAppointmentCount,
          date: endPeriod,
          interpretingTypeCriteria: interpretingTypeName,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newCompletedAppointmentStatisticRecord);
      }
    } catch (error) {
      this.lokiLogger.error(
        `Error in fillCreatedAndCompletedAppointmentsByInterpretingType: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  public async fillCancelledAppointments(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      let cancelledAppointmentCountAllRoles = 0;

      for (const userRoleName of ROLES_WHICH_CAN_CANCEL_APPOINTMENT) {
        for (const [appointmentTypeName, appointmentTypeCriteria] of Object.entries(APPOINTMENT_TYPE_CRITERIA)) {
          const cancelledAppointmentCount: number = await this.appointmentRepository.count({
            where: {
              appointmentAdminInfo: {
                cancellations: { roleName: userRoleName, creationDate: Between(startPeriod, endPeriod) },
              },
              ...appointmentTypeCriteria,
            },
          });

          const newCancelledAppointmentStatisticRecord = this.statisticRepository.create({
            chartLine: EChartLine.CANCELLED_APPOINTMENTS,
            value: cancelledAppointmentCount,
            date: endPeriod,
            appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
            userRoleName,
            statisticType: statisticType,
          });

          await this.statisticRepository.save(newCancelledAppointmentStatisticRecord);

          cancelledAppointmentCountAllRoles += cancelledAppointmentCount;
        }
      }

      const newCancelledAppointmentStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.CANCELLED_APPOINTMENTS,
        value: cancelledAppointmentCountAllRoles,
        date: endPeriod,
        appointmentTypeCriteria: EAppointmentType.ALL,
        userRoleName: "all",
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newCancelledAppointmentStatisticRecord);
    } catch (error) {
      this.lokiLogger.error(`Error in fillCancelledAppointments: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  public async fillAppointmentDuration(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    try {
      for (const [appointmentTypeName, appointmentTypeCriteria] of Object.entries(APPOINTMENT_TYPE_CRITERIA)) {
        let avgDuration: number = 0;
        const query = this.statisticsService.getAppointmentDurationQuery(
          appointmentTypeName as EAppointmentType,
          startPeriod,
          endPeriod,
          appointmentTypeCriteria,
        );

        const avgDiffMinutes: [{ avg_diff_minutes: string }] = (await this.appointmentRepository.query(query)) as [
          { avg_diff_minutes: string },
        ];

        if (avgDiffMinutes[0].avg_diff_minutes) {
          avgDuration = Math.round(Number(avgDiffMinutes[0].avg_diff_minutes));
        }

        const newAppointmentDurationStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.APPOINTMENTS_DURATION,
          value: avgDuration,
          date: endPeriod,
          appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newAppointmentDurationStatisticRecord);
      }
    } catch (error) {
      this.lokiLogger.error(`Error in fillAppointmentDuration: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  public async fillStatisticByPeriod(startPeriod: Date, endPeriod: Date, statisticType: EStatisticType): Promise<void> {
    await this.fillRegisteredActiveAndInactiveAccounts(startPeriod, endPeriod, statisticType);
    await this.fillUnsuccessfulRegistrationAttemptsAccounts(startPeriod, endPeriod, statisticType);
    await this.fillNewRegistrationAccounts(startPeriod, endPeriod, statisticType);
    await this.fillActiveInterpreters(startPeriod, endPeriod, statisticType);

    if (statisticType === EStatisticType.DAILY) {
      await this.fillDeletedAccountsDaily();
    } else {
      await this.fillDeletedAccountsByPeriod(startPeriod, endPeriod, statisticType);
    }

    await this.fillCreatedAndCompletedAppointmentsByType(startPeriod, endPeriod, statisticType);
    await this.fillCreatedAndCompletedAppointmentsByInterpretingType(startPeriod, endPeriod, statisticType);
    await this.fillCancelledAppointments(startPeriod, endPeriod, statisticType);
    await this.fillAppointmentDuration(startPeriod, endPeriod, statisticType);
  }
}
