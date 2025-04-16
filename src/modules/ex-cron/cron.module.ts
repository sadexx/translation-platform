import { Module } from "@nestjs/common";
import { CronService } from "src/modules/ex-cron/services";
import { ScheduleModule } from "@nestjs/schedule";
import { BackyCheckModule } from "src/modules/backy-check/backy-check.module";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { typeOrmConfig } from "typeorm.config";
import { ConfigModule, ConfigModuleOptions } from "@nestjs/config";
import { loadEnv } from "src/config";
import { validate } from "src/config/env";
import { StatisticsModule } from "src/modules/statistics/statistics.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { EventReminderModule } from "src/modules/event-reminder/event-reminder.module";
import { AppointmentsModule } from "src/modules/appointments/appointments.module";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { AppointmentOrdersModule } from "src/modules/appointment-orders/appointment-orders.module";
import { DraftAppointmentsModule } from "src/modules/draft-appointments/draft-appointments.module";
import { RemovalModule } from "src/modules/removal/removal.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";

const configModuleOptions: ConfigModuleOptions = {
  envFilePath: [".env"],
  isGlobal: true,
  load: [loadEnv],
  validate,
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(typeOrmConfig as TypeOrmModuleOptions),
    ConfigModule.forRoot(configModuleOptions),
    BackyCheckModule,
    StatisticsModule,
    NotificationModule,
    EventReminderModule,
    AppointmentsModule,
    ChimeMessagingConfigurationModule,
    AppointmentOrdersModule,
    DraftAppointmentsModule,
    RemovalModule,
    MembershipsModule,
    PaymentsModule,
    CompaniesDepositChargeModule,
  ],
  providers: [CronService],
})
export class CronModule {}
