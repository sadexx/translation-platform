import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Statistic } from "src/modules/statistics/entities";
import {
  CompanyStatisticsInterpreterController,
  CompanyStatisticsClientController,
  IndividualStatisticsController,
  StatisticsController,
} from "src/modules/statistics/controllers";
import {
  CompanyStatisticsInterpreterService,
  CompanyStatisticsClientService,
  FillStatisticsService,
  IndividualStatisticsService,
  StatisticsService,
} from "src/modules/statistics/services";
import { UserRole } from "src/modules/users-roles/entities";
import { Appointment } from "src/modules/appointments/entities";
import { Company } from "src/modules/companies/entities";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [TypeOrmModule.forFeature([Statistic, UserRole, Appointment, Company]), HelperModule],
  controllers: [
    StatisticsController,
    CompanyStatisticsInterpreterController,
    IndividualStatisticsController,
    CompanyStatisticsClientController,
  ],
  providers: [
    StatisticsService,
    FillStatisticsService,
    CompanyStatisticsInterpreterService,
    IndividualStatisticsService,
    CompanyStatisticsClientService,
  ],
  exports: [FillStatisticsService],
})
export class StatisticsModule {}
