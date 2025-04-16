import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import {
  AppointmentOrderCreateService,
  AppointmentOrderRecreationService,
} from "src/modules/appointment-orders-workflow/services";
import { UserRole } from "src/modules/users-roles/entities";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders-shared/appointment-orders-shared.module";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { RatesModule } from "src/modules/rates/rates.module";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { SearchTimeFrameModule } from "src/modules/search-time-frame/search-time-frame.module";
import { AppointmentsModule } from "src/modules/appointments/appointments.module";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointment-failed-payment-cancel/appointment-failed-payment-cancel.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, AppointmentOrder, AppointmentOrderGroup, UserRole, Channel]),
    forwardRef(() => AppointmentsModule),
    AppointmentOrdersSharedModule,
    SearchTimeFrameModule,
    PaymentsModule,
    RatesModule,
    AppointmentFailedPaymentCancelModule,
  ],
  providers: [AppointmentOrderCreateService, AppointmentOrderRecreationService],
  exports: [AppointmentOrderCreateService, AppointmentOrderRecreationService],
})
export class AppointmentOrdersWorkflowModule {}
