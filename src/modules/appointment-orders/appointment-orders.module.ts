import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import {
  AppointmentOrdersCommandController,
  AppointmentOrdersQueryController,
} from "src/modules/appointment-orders/controllers";
import {
  AppointmentOrderCommandService,
  AppointmentOrderQueryService,
  OrderSchedulerService,
  AppointmentOrderExpirationCancelService,
  AppointmentOrderNotificationService,
} from "src/modules/appointment-orders/services";
import { AppointmentsModule } from "src/modules/appointments/appointments.module";
import { UserRole } from "src/modules/users-roles/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/entities";
import { SearchEngineLogicModule } from "src/modules/search-engine-logic/search-engine-logic.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders-shared/appointment-orders-shared.module";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { BookingSlotManagementModule } from "src/modules/booking-slot-management/booking-slot-management.module";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { SearchTimeFrameModule } from "src/modules/search-time-frame/search-time-frame.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentOrder,
      AppointmentOrderGroup,
      AppointmentAdminInfo,
      UserRole,
      Channel,
      ChimeMeetingConfiguration,
      AppointmentReminder,
    ]),
    AppointmentsModule,
    ChimeMeetingConfigurationModule,
    AppointmentOrdersSharedModule,
    SearchEngineLogicModule,
    NotificationModule,
    BookingSlotManagementModule,
    SearchTimeFrameModule,
    HelperModule,
  ],
  controllers: [AppointmentOrdersCommandController, AppointmentOrdersQueryController],
  providers: [
    AppointmentOrderExpirationCancelService,
    AppointmentOrderCommandService,
    AppointmentOrderQueryService,
    OrderSchedulerService,
    AppointmentOrderNotificationService,
  ],
  exports: [AppointmentOrderQueryService, OrderSchedulerService],
})
export class AppointmentOrdersModule {}
