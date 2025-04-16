import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders-shared/services";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentOrder, AppointmentOrderGroup]), NotificationModule],
  providers: [AppointmentOrderQueryOptionsService, AppointmentOrderSharedLogicService],
  exports: [AppointmentOrderQueryOptionsService, AppointmentOrderSharedLogicService],
})
export class AppointmentOrdersSharedModule {}
