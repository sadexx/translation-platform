import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Appointment, AppointmentReminder } from "src/modules/appointments/entities";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointment-failed-payment-cancel/services";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentReminder,
      ChimeMeetingConfiguration,
      AppointmentOrder,
      AppointmentOrderGroup,
    ]),
    DiscountsModule,
    ChimeMessagingConfigurationModule,
    NotificationModule,
  ],
  providers: [AppointmentFailedPaymentCancelService],
  exports: [AppointmentFailedPaymentCancelService],
})
export class AppointmentFailedPaymentCancelModule {}
