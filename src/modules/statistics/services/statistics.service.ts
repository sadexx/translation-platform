import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { ESortOrder } from "src/common/enums";
import { Statistic } from "src/modules/statistics/entities";
import { EAppointmentType, EChartLine, EStatisticType } from "src/modules/statistics/common/enums";
import {
  INTERPRETER_ROLES,
  NUMBER_OF_DAYS_IN_MONTH,
  NUMBER_OF_DAYS_IN_SEVEN_YEARS,
  NUMBER_OF_DAYS_IN_THREE_MONTH,
  NUMBER_OF_DAYS_IN_TWO_YEARS,
} from "src/common/constants";
import {
  IAppointmentTypeCriteria,
  IChartLineData,
  IGetFirstStatisticRecord,
  ILineData,
} from "src/modules/statistics/common/interfaces";
import {
  GetAdminInterpreterStatisticsDto,
  GetAdminStatisticsDto,
  GetAppointmentsByInterpretingTypeDto,
  GetAppointmentsByLanguageDto,
  GetAppointmentsWithoutInterpreterDto,
  GetCancelledAppointmentDto,
  GetAppointmentsByTypeDto,
  GetRejectedVsAcceptedAppointmentsDto,
} from "src/modules/statistics/common/dto";
import { Appointment } from "src/modules/appointments/entities";
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  eachYearOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { APPOINTMENT_TYPE_CRITERIA } from "src/modules/statistics/common/constants/constants";

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Statistic)
    private readonly statisticRepository: Repository<Statistic>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  public async getFirstAdminRecordDate(): Promise<IGetFirstStatisticRecord> {
    const firstRecord = await this.statisticRepository.findOne({
      where: {},
      order: {
        date: ESortOrder.ASC,
      },
    });

    if (!firstRecord) {
      throw new BadRequestException("Statistics is empty!");
    }

    return { firstStatisticRecordDate: firstRecord.date };
  }

  public async getRegisteredAndActiveUsers(dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const registeredChartLine: EChartLine = EChartLine.REGISTERED_USERS;
    const activeChartLine: EChartLine = EChartLine.ACTIVE_USERS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      const registeredAccountRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine: registeredChartLine,
          date: Between(dateFrom, dateTo),
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(registeredAccountRecords, result, registeredChartLine, statisticType);

      const activeAccountRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine: activeChartLine,
          date: Between(dateFrom, dateTo),
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(activeAccountRecords, result, activeChartLine, statisticType);
    }

    return result;
  }

  public async getInactiveUsers(dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.INACTIVE_ACCOUNTS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      const inactiveAccountRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine,
          date: Between(dateFrom, dateTo),
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(inactiveAccountRecords, result, chartLine, statisticType);
    }

    return result;
  }

  public async getUnsuccessfulRegistrationAttemptsUsers(dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.UNSUCCESSFUL_REGISTRATION;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      const unsuccessfulRegistrationAttemptsRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine: chartLine,
          date: Between(dateFrom, dateTo),
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(unsuccessfulRegistrationAttemptsRecords, result, chartLine, statisticType);
    }

    return result;
  }

  public async getNewRegistrationUsers(dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.NEW_USER_REGISTRATION;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      const newRegistrationRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine,
          date: Between(dateFrom, dateTo),
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(newRegistrationRecords, result, chartLine, statisticType);
    }

    return result;
  }

  public async getActiveInterpreters(dto: GetAdminInterpreterStatisticsDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.ACTIVE_INTERPRETERS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      const activeInterpretersRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine,
          date: Between(dateFrom, dateTo),
          interpreterAppointmentCriteria: dto.activeCriteria,
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(activeInterpretersRecords, result, chartLine, statisticType);
    }

    return result;
  }

  public async getDeleted(dto: GetAdminStatisticsDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.DELETED_ACCOUNTS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      const deletedRecords = await this.statisticRepository.find({
        where: {
          userRoleName: roleName,
          chartLine,
          date: Between(dateFrom, dateTo),
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(deletedRecords, result, chartLine, statisticType);
    }

    return result;
  }

  public async getRejectedVsAcceptedAppointments(dto: GetAppointmentsByLanguageDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const acceptedChartLine: EChartLine = EChartLine.ACCEPTED_APPOINTMENTS;
    const rejectedChartLine: EChartLine = EChartLine.REJECTED_APPOINTMENTS;

    const statisticType = this.getStatisticType(dateFrom, dateTo);
    const dates = this.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineData = {
      [acceptedChartLine]: { values: [], labels: [] },
      [rejectedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [acceptedCount, rejectedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            acceptedDate: Between(period.startPeriod, period.endPeriod),
          },
        }),
        this.appointmentRepository.count({
          where: {
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            appointmentAdminInfo: {
              cancellations: {
                roleName: In(INTERPRETER_ROLES),
              },
            },
          },
        }),
      ]);

      const formatDay = this.formatDate(period.endPeriod, statisticType, index);

      result[acceptedChartLine]?.values.push(acceptedCount);
      result[acceptedChartLine]?.labels.push(formatDay);
      result[rejectedChartLine]?.values.push(rejectedCount);
      result[rejectedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getRejectedVsAcceptedAppointmentsByInterpreter(
    dto: GetRejectedVsAcceptedAppointmentsDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const acceptedChartLine: EChartLine = EChartLine.ACCEPTED_APPOINTMENTS;
    const rejectedChartLine: EChartLine = EChartLine.REJECTED_APPOINTMENTS;

    const statisticType = this.getStatisticType(dateFrom, dateTo);
    const dates = this.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineData = {
      [acceptedChartLine]: { values: [], labels: [] },
      [rejectedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [acceptedCount, rejectedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            acceptedDate: Between(period.startPeriod, period.endPeriod),
            interpreter: {
              id: dto.userRoleId,
            },
          },
        }),
        this.appointmentRepository.count({
          where: {
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            appointmentAdminInfo: {
              cancellations: {
                roleName: In(INTERPRETER_ROLES),
              },
            },
            interpreter: {
              id: dto.userRoleId,
            },
          },
        }),
      ]);

      const formatDay = this.formatDate(period.endPeriod, statisticType, index);

      result[acceptedChartLine]?.values.push(acceptedCount);
      result[acceptedChartLine]?.labels.push(formatDay);
      result[rejectedChartLine]?.values.push(rejectedCount);
      result[rejectedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByType(dto: GetAppointmentsByTypeDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const appointmentType of dto.appointmentTypes) {
      const createdRecords = await this.statisticRepository.find({
        where: {
          chartLine: createdChartLine,
          date: Between(dateFrom, dateTo),
          appointmentTypeCriteria: appointmentType,
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(createdRecords, result, createdChartLine, statisticType);

      const completedRecords = await this.statisticRepository.find({
        where: {
          chartLine: completedChartLine,
          date: Between(dateFrom, dateTo),
          appointmentTypeCriteria: appointmentType,
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(completedRecords, result, completedChartLine, statisticType);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByLanguage(dto: GetAppointmentsByLanguageDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.getStatisticType(dateFrom, dateTo);
    const dates = this.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineData = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [createdCount, completedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            creationDate: Between(period.startPeriod, period.endPeriod),
          },
        }),
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
          },
        }),
      ]);

      const formatDay = this.formatDate(period.endPeriod, statisticType, index);

      result[createdChartLine]?.values.push(createdCount);
      result[createdChartLine]?.labels.push(formatDay);
      result[completedChartLine]?.values.push(completedCount);
      result[completedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByInterpretingType(
    dto: GetAppointmentsByInterpretingTypeDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const interpretingType of dto.interpretingTypes) {
      const createdRecords = await this.statisticRepository.find({
        where: {
          chartLine: createdChartLine,
          date: Between(dateFrom, dateTo),
          interpretingTypeCriteria: interpretingType,
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(createdRecords, result, createdChartLine, statisticType);

      const completedRecords = await this.statisticRepository.find({
        where: {
          chartLine: completedChartLine,
          date: Between(dateFrom, dateTo),
          interpretingTypeCriteria: interpretingType,
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(completedRecords, result, completedChartLine, statisticType);
    }

    return result;
  }

  public async getCancelledAppointments(dto: GetCancelledAppointmentDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const roleName of dto.roleNames) {
      for (const appointmentType of dto.appointmentTypes) {
        const cancelledAppointmentRecords = await this.statisticRepository.find({
          where: {
            userRoleName: roleName,
            appointmentTypeCriteria: appointmentType,
            chartLine,
            date: Between(dateFrom, dateTo),
            statisticType,
          },
          order: {
            date: ESortOrder.ASC,
          },
        });

        result = this.updateResult(cancelledAppointmentRecords, result, chartLine, statisticType);
      }
    }

    return result;
  }

  public async getAppointmentsDuration(dto: GetAppointmentsByTypeDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_DURATION;

    const statisticType: EStatisticType = this.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {};

    for (const appointmentType of dto.appointmentTypes) {
      const appointmentDurationRecords = await this.statisticRepository.find({
        where: {
          chartLine: chartLine,
          date: Between(dateFrom, dateTo),
          appointmentTypeCriteria: appointmentType,
          statisticType,
        },
        order: {
          date: ESortOrder.ASC,
        },
      });

      result = this.updateResult(appointmentDurationRecords, result, chartLine, statisticType);
    }

    return result;
  }

  public getDates(dtoDateFrom: Date, dtoDateTo: Date): { dateFrom: Date; dateTo: Date } {
    const dateFrom = startOfDay(new Date(dtoDateFrom));
    const dateTo = endOfDay(new Date(dtoDateTo));

    return { dateFrom, dateTo };
  }

  public updateResult(
    statisticRecords: Statistic[],
    result: IChartLineData,
    chartLine: EChartLine,
    statisticType: EStatisticType,
  ): IChartLineData {
    const resultByRole: ILineData = { values: [], labels: [] };

    for (const [index, statisticRecord] of statisticRecords.entries()) {
      resultByRole.values.push(statisticRecord.value);
      resultByRole.labels.push(this.formatDate(statisticRecord.date, statisticType, index));
    }

    if (
      result[chartLine] === undefined ||
      result[chartLine]?.values === undefined ||
      result[chartLine]?.labels === undefined
    ) {
      result[chartLine] = resultByRole;
    } else {
      for (let i = 0; i < resultByRole.values.length; i++) {
        const ind = result[chartLine]?.labels.indexOf(resultByRole.labels[i]);

        if (ind < 0) {
          result[chartLine].values.push(resultByRole.values[i]);
          result[chartLine].labels.push(resultByRole.labels[i]);
        } else {
          result[chartLine].values[ind] += resultByRole.values[i];
        }
      }
    }

    return result;
  }

  public updateResultFromArray(
    newResultData: IChartLineData,
    result: IChartLineData,
    chartLine: EChartLine,
  ): IChartLineData {
    if (
      result[chartLine] === undefined ||
      result[chartLine]?.values === undefined ||
      result[chartLine]?.labels === undefined
    ) {
      result[chartLine] = newResultData[chartLine];
    } else {
      for (let i = 0; i < newResultData[chartLine]!.values.length; i++) {
        const ind = result[chartLine]?.labels.indexOf(newResultData[chartLine]!.labels[i]);

        if (ind < 0) {
          result[chartLine].values.push(newResultData[chartLine]!.values[i]);
          result[chartLine].labels.push(newResultData[chartLine]!.labels[i]);
        } else {
          result[chartLine].values[ind] += newResultData[chartLine]!.values[i];
        }
      }
    }

    return result;
  }

  public getStatisticType(dateFrom: Date, dateTo: Date): EStatisticType {
    const daysDiff = differenceInDays(dateTo, dateFrom);

    let statisticType: EStatisticType = EStatisticType.DAILY;

    if (daysDiff <= NUMBER_OF_DAYS_IN_MONTH) {
      statisticType = EStatisticType.DAILY;
    } else if (daysDiff <= NUMBER_OF_DAYS_IN_THREE_MONTH) {
      statisticType = EStatisticType.WEEKLY;
    } else if (daysDiff <= NUMBER_OF_DAYS_IN_TWO_YEARS) {
      statisticType = EStatisticType.MONTHLY;
    } else if (daysDiff <= NUMBER_OF_DAYS_IN_SEVEN_YEARS) {
      statisticType = EStatisticType.YEARLY;
    } else {
      throw new BadRequestException("Too long date range");
    }

    return statisticType;
  }

  public formatDate(date: Date, statisticType: EStatisticType, dateIndex: number): string {
    if (statisticType === EStatisticType.DAILY) {
      return format(date, "d MMM");
    } else if (statisticType === EStatisticType.WEEKLY) {
      return format(date, "d MMM") + ` (Week ${dateIndex + 1})`;
    } else if (statisticType === EStatisticType.MONTHLY) {
      return format(date, "MMM yyyy");
    } else if (statisticType === EStatisticType.YEARLY) {
      return format(date, "yyyy");
    } else {
      throw new BadRequestException("Incorrect statistic type");
    }
  }

  public getDatesByStatisticType(
    dateFrom: Date,
    dateTo: Date,
    statisticType: EStatisticType,
  ): { startPeriod: Date; endPeriod: Date }[] {
    const dates: { startPeriod: Date; endPeriod: Date }[] = [];

    if (statisticType === EStatisticType.DAILY) {
      const daysBetween = eachDayOfInterval({ start: dateFrom, end: dateTo });

      for (const day of daysBetween) {
        dates.push({ startPeriod: startOfDay(day), endPeriod: endOfDay(day) });
      }
    } else if (statisticType === EStatisticType.WEEKLY) {
      const weeksBetween = eachWeekOfInterval({ start: dateFrom, end: dateTo });

      for (const week of weeksBetween) {
        const startPeriod = addDays(startOfWeek(week), 1);
        const endPeriod = addDays(endOfWeek(week), 1);

        if (startPeriod > dateFrom && endPeriod < dateTo) {
          dates.push({ startPeriod, endPeriod });
        }
      }
    } else if (statisticType === EStatisticType.MONTHLY) {
      const monthBetween = eachMonthOfInterval({ start: dateFrom, end: dateTo });

      for (const month of monthBetween) {
        const startPeriod = startOfMonth(month);
        const endPeriod = endOfMonth(month);

        if (startPeriod > dateFrom && endPeriod < dateTo) {
          dates.push({ startPeriod, endPeriod });
        }
      }
    } else if (statisticType === EStatisticType.YEARLY) {
      const yearsBetween = eachYearOfInterval({ start: dateFrom, end: dateTo });

      for (const year of yearsBetween) {
        const startPeriod = startOfYear(year);
        const endPeriod = endOfYear(year);

        if (startPeriod > dateFrom && endPeriod < dateTo) {
          dates.push({ startPeriod, endPeriod });
        }
      }
    } else {
      throw new BadRequestException("Incorrect statistic type");
    }

    return dates;
  }

  public getAppointmentDurationQuery(
    appointmentTypeName: EAppointmentType,
    startPeriod: Date,
    endPeriod: Date,
    appointmentTypeCriteria: IAppointmentTypeCriteria,
    clientCompanyId?: string,
    clientUserRoleId?: string,
    interpreterSubordinateCompaniesIds?: string[],
    interpreterCompanyId?: string,
  ): string {
    let query;

    let clientCompanyQueryJoin = "";
    let clientCompanyQueryWhere = "";
    let clientQueryWhere = "";
    let interpreterSubordinateQueryJoin = "";
    let interpreterSubordinateQueryWhere = "";
    let interpreterSubordinateCompaniesIdsQuery = "";
    let interpreterCompanyQueryJoin = "";
    let interpreterCompanyQueryWhere = "";
    let interpreterCompanyAndSubordinateQueryWhere = "";

    if (clientCompanyId) {
      clientCompanyQueryJoin = "JOIN user_roles AS client ON appointments.client_id = client.id ";
      clientCompanyQueryWhere = `AND client.operated_by_company_id = '${clientCompanyId}' `;
    }

    if (interpreterCompanyId) {
      interpreterCompanyQueryJoin = "JOIN user_roles AS interpreter ON appointments.interpreter_id = interpreter.id ";
      interpreterCompanyQueryWhere = `AND interpreter.operated_by_company_id = '${interpreterCompanyId}' `;
    }

    if (interpreterSubordinateCompaniesIds && interpreterSubordinateCompaniesIds.length > 0) {
      for (const id of interpreterSubordinateCompaniesIds) {
        if (interpreterSubordinateCompaniesIdsQuery.length !== 0) {
          interpreterSubordinateCompaniesIdsQuery += ", ";
        }

        interpreterSubordinateCompaniesIdsQuery += `'${id}'`;
      }

      interpreterSubordinateCompaniesIdsQuery += " ";

      interpreterSubordinateQueryJoin = "JOIN user_roles AS client ON appointments.client_id = client.id ";
      interpreterSubordinateQueryWhere = `AND client.operated_by_company_id IN (${interpreterSubordinateCompaniesIdsQuery}) `;
    }

    if (interpreterCompanyId && interpreterSubordinateCompaniesIds && interpreterSubordinateCompaniesIds.length > 0) {
      clientCompanyQueryJoin = "JOIN user_roles AS client ON appointments.client_id = client.id ";
      interpreterCompanyQueryJoin = "JOIN user_roles AS interpreter ON appointments.interpreter_id = interpreter.id ";
      interpreterCompanyQueryWhere = "";
      interpreterSubordinateQueryJoin = "";
      interpreterSubordinateQueryWhere = "";

      for (const id of interpreterSubordinateCompaniesIds) {
        if (interpreterSubordinateCompaniesIdsQuery.length !== 0) {
          interpreterSubordinateCompaniesIdsQuery += ", ";
        }

        interpreterSubordinateCompaniesIdsQuery += `'${id}'`;
      }

      interpreterSubordinateCompaniesIdsQuery += " ";

      interpreterCompanyAndSubordinateQueryWhere = `AND (client.operated_by_company_id IN (${interpreterSubordinateCompaniesIdsQuery}) OR interpreter.operated_by_company_id = '${interpreterCompanyId}') `;
    }

    if (clientUserRoleId) {
      clientQueryWhere = `AND client_id = '${clientUserRoleId}' `;
    }

    if (appointmentTypeName === EAppointmentType.ALL) {
      /*
       * calculate real time + business time
       */

      query =
        "SELECT AVG( " +
        "CASE WHEN communication_type = 'face-to-face' THEN EXTRACT(EPOCH FROM (business_end_time - scheduled_start_time)) / 60 " +
        "ELSE EXTRACT(EPOCH FROM (client_last_active_time - scheduled_start_time)) / 60 END " +
        ") AS avg_diff_minutes " +
        "FROM appointments " +
        clientCompanyQueryJoin +
        interpreterCompanyQueryJoin +
        interpreterSubordinateQueryJoin +
        "WHERE business_end_time IS NOT NULL " +
        "AND scheduled_start_time IS NOT NULL " +
        `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}' ` +
        clientCompanyQueryWhere +
        clientQueryWhere +
        interpreterSubordinateQueryWhere +
        interpreterCompanyQueryWhere +
        interpreterCompanyAndSubordinateQueryWhere +
        `AND status = '${EAppointmentStatus.COMPLETED}';`;
    } else if (appointmentTypeCriteria.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      /*
       * calculate business time
       */

      query =
        "SELECT AVG(EXTRACT(EPOCH FROM (business_end_time - scheduled_start_time)) / 60) AS avg_diff_minutes " +
        "FROM appointments " +
        clientCompanyQueryJoin +
        interpreterCompanyQueryJoin +
        interpreterSubordinateQueryJoin +
        "WHERE business_end_time IS NOT NULL " +
        "AND scheduled_start_time IS NOT NULL " +
        `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}' ` +
        `AND status = '${EAppointmentStatus.COMPLETED}' ` +
        `AND communication_type = '${appointmentTypeCriteria.communicationType}' ` +
        clientCompanyQueryWhere +
        clientQueryWhere +
        interpreterSubordinateQueryWhere +
        interpreterCompanyQueryWhere +
        interpreterCompanyAndSubordinateQueryWhere +
        `AND scheduling_type = '${appointmentTypeCriteria.schedulingType}';`;
    } else {
      /*
       * calculate real time
       */

      query =
        "SELECT AVG(EXTRACT(EPOCH FROM (client_last_active_time - scheduled_start_time)) / 60) AS avg_diff_minutes " +
        "FROM appointments " +
        clientCompanyQueryJoin +
        interpreterCompanyQueryJoin +
        interpreterSubordinateQueryJoin +
        "WHERE client_last_active_time IS NOT NULL " +
        "AND scheduled_start_time IS NOT NULL " +
        `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}' ` +
        `AND status = '${EAppointmentStatus.COMPLETED}' ` +
        `AND communication_type = '${appointmentTypeCriteria.communicationType}' ` +
        clientCompanyQueryWhere +
        clientQueryWhere +
        interpreterSubordinateQueryWhere +
        interpreterCompanyQueryWhere +
        interpreterCompanyAndSubordinateQueryWhere +
        `AND scheduling_type = '${appointmentTypeCriteria.schedulingType}';`;
    }

    return query;
  }

  public async getAppointmentsWithoutInterpreterByType(
    dto: GetAppointmentsWithoutInterpreterDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_WITHOUT_INTERPRETER;

    const statisticType = this.getStatisticType(dateFrom, dateTo);
    const dates = this.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineData = {};

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineData = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const count = await this.appointmentRepository.count({
          where: {
            ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
            status: EAppointmentStatus.CANCELLED_BY_SYSTEM,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            appointmentAdminInfo: {
              isInterpreterFound: false,
            },
            updatingDate: Between(period.startPeriod, period.endPeriod),
          },
        });

        const formatDay = this.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(count);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getUnansweredOnDemandRequests(dto: GetAppointmentsByLanguageDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.UNANSWERED_ON_DEMAND_APPOINTMENTS;

    const statisticType = this.getStatisticType(dateFrom, dateTo);
    const dates = this.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineData = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const count = await this.appointmentRepository.count({
        where: {
          schedulingType: EAppointmentSchedulingType.ON_DEMAND,
          status: EAppointmentStatus.CANCELLED_BY_SYSTEM,
          languageFrom: dto.languageFrom,
          languageTo: dto.languageTo,
          appointmentAdminInfo: {
            isInterpreterFound: false,
          },
          updatingDate: Between(period.startPeriod, period.endPeriod),
        },
      });

      const formatDay = this.formatDate(period.endPeriod, statisticType, index);

      result[chartLine]?.values.push(count);
      result[chartLine]?.labels.push(formatDay);
    }

    return result;
  }
}
