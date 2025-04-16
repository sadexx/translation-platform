import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, In, Repository } from "typeorm";
import { EChartLine, EChartsHomepageLine } from "src/modules/statistics/common/enums";
import {
  IChartHomepageLineData,
  IChartLineData,
  IChartRoundData,
  IGetHomepageBaseAppointmentStatistic,
} from "src/modules/statistics/common/interfaces";
import {
  GetAppointmentsByInterpretingTypeAndClientDto,
  GetAppointmentsByLanguageAndClientDto,
  GetAppointmentsWithoutInterpreterByClientDto,
  GetCancelledAppointmentsByClientDto,
  GetCompletedAppointmentByTypeAndInterpreterDto,
  GetCreatedVsCompletedAppointmentsByTypeAndClientDto,
  GetEarnedMoneyByInterpreterDto,
  GetHomepageBaseAppointmentStatisticDto,
  GetSpentCostByClient,
} from "src/modules/statistics/common/dto";
import { Appointment } from "src/modules/appointments/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/common/enums";
import { StatisticsService } from "src/modules/statistics/services";
import {
  APPOINTMENT_INTERPRETING_CRITERIA,
  APPOINTMENT_TYPE_CRITERIA,
} from "src/modules/statistics/common/constants/constants";
import { UserRole } from "src/modules/users-roles/entities";
import { INTERPRETER_ROLES, CLIENT_ROLES } from "src/common/constants";

@Injectable()
export class IndividualStatisticsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly statisticsService: StatisticsService,
  ) {}

  public async getCreatedVsCompletedAppointmentsByTypeAndClient(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndClientDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineData = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineData = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                id: dto.userRoleId,
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
              client: {
                id: dto.userRoleId,
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByLanguageAndClient(
    dto: GetAppointmentsByLanguageAndClientDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

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
            client: {
              id: dto.userRoleId,
            },
          },
        }),
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
            client: {
              id: dto.userRoleId,
            },
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[createdChartLine]?.values.push(createdCount);
      result[createdChartLine]?.labels.push(formatDay);
      result[completedChartLine]?.values.push(completedCount);
      result[completedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByInterpretingTypeAndClient(
    dto: GetAppointmentsByInterpretingTypeAndClientDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);

    let result: IChartLineData = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    for (const interpretingType of dto.interpretingTypes) {
      const resultByType: IChartLineData = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              interpretingType: APPOINTMENT_INTERPRETING_CRITERIA[interpretingType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                id: dto.userRoleId,
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              interpretingType: APPOINTMENT_INTERPRETING_CRITERIA[interpretingType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
              client: {
                id: dto.userRoleId,
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCancelledAppointmentsByClient(dto: GetCancelledAppointmentsByClientDto): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineData = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineData = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const canceledCount = await this.appointmentRepository.count({
          where: {
            ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
            appointmentAdminInfo: {
              cancellations: {
                creationDate: Between(period.startPeriod, period.endPeriod),
              },
            },
            client: {
              id: dto.userRoleId,
            },
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(canceledCount);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getAppointmentsDurationByClient(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndClientDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_DURATION;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineData = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineData = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        let avgDuration: number = 0;

        const query = this.statisticsService.getAppointmentDurationQuery(
          appointmentType,
          period.startPeriod,
          period.endPeriod,
          APPOINTMENT_TYPE_CRITERIA[appointmentType],
          undefined,
          dto.userRoleId,
        );

        const avgDiffMinutes: [{ avg_diff_minutes: string }] = (await this.appointmentRepository.query(query)) as [
          { avg_diff_minutes: string },
        ];

        if (avgDiffMinutes[0].avg_diff_minutes) {
          avgDuration = Math.round(Number(avgDiffMinutes[0].avg_diff_minutes));
        }

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(avgDuration);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getCompletedAppointmentsByTypeAndInterpreter(
    dto: GetCompletedAppointmentByTypeAndInterpreterDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineData = {
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineData = {
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const completedCount = await this.appointmentRepository.count({
          where: {
            communicationType: APPOINTMENT_TYPE_CRITERIA[appointmentType].communicationType,
            schedulingType: APPOINTMENT_TYPE_CRITERIA[appointmentType].schedulingType,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
            interpreterId: dto.userRoleId,
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCanceledAppointmentsByTypeAndInterpreter(
    dto: GetCompletedAppointmentByTypeAndInterpreterDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineData = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineData = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const canceledCount = await this.appointmentRepository.count({
          where: {
            communicationType: APPOINTMENT_TYPE_CRITERIA[appointmentType].communicationType,
            schedulingType: APPOINTMENT_TYPE_CRITERIA[appointmentType].schedulingType,
            appointmentAdminInfo: {
              cancellations: {
                cancelledById: dto.userRoleId,
                creationDate: Between(period.startPeriod, period.endPeriod),
              },
            },
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(canceledCount);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getHomepageBaseAppointmentInfoByUserRoleId(
    dto: GetHomepageBaseAppointmentStatisticDto,
  ): Promise<IGetHomepageBaseAppointmentStatistic> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);

    const appointmentCountWhere: FindOptionsWhere<Appointment> = {
      updatingDate: Between(dateFrom, dateTo),
      status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
    };

    let appointmentDurationQuery =
      "SELECT SUM( " +
      "CASE " +
      `WHEN appointments.communication_type = '${EAppointmentCommunicationType.FACE_TO_FACE}' THEN EXTRACT(EPOCH FROM (appointments.business_end_time - appointments.scheduled_start_time)) / 60 ` +
      "ELSE " +
      "CASE " +
      "WHEN appointments.client_last_active_time IS NULL THEN 0 " +
      "WHEN appointments.client_last_active_time < appointments.scheduled_start_time THEN 0 " +
      "ELSE EXTRACT(EPOCH FROM (appointments.client_last_active_time - appointments.scheduled_start_time)) / 60 " +
      "END " +
      "END " +
      ") AS total_duration_in_minutes " +
      "FROM appointments " +
      `WHERE appointments.status IN ('${EAppointmentStatus.COMPLETED}', '${EAppointmentStatus.COMPLETED_ACTION_REQUIRED}') ` +
      `AND appointments.updating_date BETWEEN '${dateFrom.toISOString()}' AND '${dateTo.toISOString()}' `;

    const userRole = await this.userRoleRepository.findOne({
      where: { id: dto.userRoleId },
      relations: { role: true },
    });

    if (!userRole) {
      throw new BadRequestException("This user role not exist!");
    }

    if (CLIENT_ROLES.includes(userRole.role.name)) {
      appointmentCountWhere.clientId = dto.userRoleId;
      appointmentDurationQuery += `AND appointments.client_id = '${dto.userRoleId}' `;
    } else if (INTERPRETER_ROLES.includes(userRole.role.name)) {
      appointmentCountWhere.interpreterId = dto.userRoleId;
      appointmentDurationQuery += `AND appointments.interpreter_id = '${dto.userRoleId}' `;
    } else {
      throw new BadRequestException("Incorrect role!");
    }

    const onDemandCount = await this.appointmentRepository.count({
      where: {
        ...appointmentCountWhere,
        schedulingType: EAppointmentSchedulingType.ON_DEMAND,
      },
    });

    const preBookedCount = await this.appointmentRepository.count({
      where: {
        ...appointmentCountWhere,
        schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
      },
    });

    const [onDemandDuration]: [{ total_duration_in_minutes: string }] = (await this.appointmentRepository.query(
      appointmentDurationQuery + `AND appointments.scheduling_type = '${EAppointmentSchedulingType.ON_DEMAND}';`,
    )) as [{ total_duration_in_minutes: string }];

    const [preBookedDuration]: [{ total_duration_in_minutes: string }] = (await this.appointmentRepository.query(
      appointmentDurationQuery + `AND appointments.scheduling_type = '${EAppointmentSchedulingType.PRE_BOOKED}';`,
    )) as [{ total_duration_in_minutes: string }];

    return {
      all: {
        count: onDemandCount + preBookedCount,
        duration:
          Number(onDemandDuration.total_duration_in_minutes) + Number(preBookedDuration.total_duration_in_minutes),
      },
      onDemand: {
        count: onDemandCount,
        duration: Number(onDemandDuration.total_duration_in_minutes),
      },
      preBooked: {
        count: preBookedCount,
        duration: Number(preBookedDuration.total_duration_in_minutes),
      },
    };
  }

  public async getHomepageChartsAppointmentInfoByUserRoleId(
    dto: GetHomepageBaseAppointmentStatisticDto,
  ): Promise<IChartHomepageLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const allChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_ALL;
    const onDemandChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_ON_DEMAND;
    const preBookedChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_PRE_BOOKED;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartHomepageLineData = {
      [allChartLine]: { values: [], labels: [] },
      [onDemandChartLine]: { values: [], labels: [] },
      [preBookedChartLine]: { values: [], labels: [] },
    };

    const appointmentCountWhere: FindOptionsWhere<Appointment> = {
      status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED]),
    };

    const userRole = await this.userRoleRepository.findOne({
      where: { id: dto.userRoleId },
      relations: { role: true },
    });

    if (!userRole) {
      throw new BadRequestException("This user role not exist!");
    }

    if (CLIENT_ROLES.includes(userRole.role.name)) {
      appointmentCountWhere.clientId = dto.userRoleId;
    } else if (INTERPRETER_ROLES.includes(userRole.role.name)) {
      appointmentCountWhere.interpreterId = dto.userRoleId;
    } else {
      throw new BadRequestException("Incorrect role!");
    }

    for (const [index, period] of dates.entries()) {
      const [allCount, onDemandCount, preBookedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
          },
        }),
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
            schedulingType: EAppointmentSchedulingType.ON_DEMAND,
          },
        }),
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[allChartLine]?.values.push(allCount);
      result[allChartLine]?.labels.push(formatDay);
      result[onDemandChartLine]?.values.push(onDemandCount);
      result[onDemandChartLine]?.labels.push(formatDay);
      result[preBookedChartLine]?.values.push(preBookedCount);
      result[preBookedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getAppointmentsWithoutInterpreterByTypeAndClient(
    dto: GetAppointmentsWithoutInterpreterByClientDto,
  ): Promise<IChartLineData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_WITHOUT_INTERPRETER;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

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
            client: {
              id: dto.userRoleId,
            },
            updatingDate: Between(period.startPeriod, period.endPeriod),
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(count);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getSpentCostByClient(dto: GetSpentCostByClient): Promise<IChartRoundData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    this.statisticsService.getStatisticType(dateFrom, dateTo);

    const result: IChartRoundData = {
      all: 0,
      onDemand: 0,
      preBooked: 0,
      chart: [],
    };

    const aggregatedAppointments = await this.appointmentRepository
      .createQueryBuilder("appointment")
      .select("appointment.interpretingType", "interpretingType")
      .addSelect("appointment.schedulingType", "schedulingType")
      .addSelect("SUM(CAST(appointment.paidByClient AS float))", "paidByClient")
      .innerJoin("appointment.client", "client")
      .where("appointment.creationDate BETWEEN :start AND :end", { start: dateFrom, end: dateTo })
      .andWhere("appointment.status IN (:...statuses)", {
        statuses: [EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED],
      })
      .andWhere("client.id = :userRoleId", { userRoleId: dto.userRoleId })
      .groupBy("appointment.interpretingType")
      .addGroupBy("appointment.schedulingType")
      .getRawMany<Appointment>();

    const interpretingTypeMap: Record<string, number> = {};

    for (const appointment of aggregatedAppointments) {
      const { interpretingType, schedulingType } = appointment;
      const paidByClient = Number(appointment.paidByClient);

      result.all += paidByClient;

      if (schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
        result.onDemand += paidByClient;
      } else if (schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
        result.preBooked += paidByClient;
      }

      interpretingTypeMap[interpretingType] = (interpretingTypeMap[interpretingType] || 0) + paidByClient;
    }

    for (const type in interpretingTypeMap) {
      result.chart.push({ label: type, value: interpretingTypeMap[type] });
    }

    return result;
  }

  public async getEarnedMoneyByInterpreter(dto: GetEarnedMoneyByInterpreterDto): Promise<IChartRoundData> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    this.statisticsService.getStatisticType(dateFrom, dateTo);

    const result: IChartRoundData = {
      all: 0,
      onDemand: 0,
      preBooked: 0,
      chart: [],
    };

    const aggregatedAppointments = await this.appointmentRepository
      .createQueryBuilder("appointment")
      .select("appointment.interpretingType", "interpretingType")
      .addSelect("appointment.schedulingType", "schedulingType")
      .addSelect("SUM(CAST(appointment.receivedByInterpreter AS float))", "receivedByInterpreter")
      .innerJoin("appointment.interpreter", "interpreter")
      .where("appointment.creationDate BETWEEN :start AND :end", { start: dateFrom, end: dateTo })
      .andWhere("appointment.status IN (:...statuses)", {
        statuses: [EAppointmentStatus.COMPLETED, EAppointmentStatus.COMPLETED_ACTION_REQUIRED],
      })
      .andWhere("interpreter.id = :userRoleId", { userRoleId: dto.userRoleId })
      .groupBy("appointment.interpretingType")
      .addGroupBy("appointment.schedulingType")
      .getRawMany<Appointment>();

    const interpretingTypeMap: Record<string, number> = {};

    for (const appointment of aggregatedAppointments) {
      const { interpretingType, schedulingType } = appointment;
      const receivedByInterpreter = Number(appointment.receivedByInterpreter);

      result.all += receivedByInterpreter;

      if (schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
        result.onDemand += receivedByInterpreter;
      } else if (schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
        result.preBooked += receivedByInterpreter;
      }

      interpretingTypeMap[interpretingType] = (interpretingTypeMap[interpretingType] || 0) + receivedByInterpreter;
    }

    for (const type in interpretingTypeMap) {
      result.chart.push({ label: type, value: interpretingTypeMap[type] });
    }

    return result;
  }
}
