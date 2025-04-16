import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Appointment,
  AppointmentAdminInfo,
  AppointmentCancellationInfo,
  AppointmentEndDetail,
  AppointmentRating,
  AppointmentReminder,
} from "src/modules/appointments/entities";
import { AppointmentsCommandController, AppointmentsQueryController } from "src/modules/appointments/controllers";
import {
  AppointmentCancelService,
  AppointmentCommandService,
  AppointmentCreateService,
  AppointmentEndService,
  AppointmentNotificationService,
  AppointmentQueryService,
  AppointmentRatingService,
  AppointmentSchedulerService,
  AppointmentUpdateService,
} from "src/modules/appointments/services";
import { UserRole } from "src/modules/users-roles/entities";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { MultiWayParticipantModule } from "src/modules/multi-way-participant/multi-way-participant.module";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { AppointmentsSharedModule } from "src/modules/appointments-shared/appointments-shared.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { BookingSlotManagementModule } from "src/modules/booking-slot-management/booking-slot-management.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { Address } from "src/modules/addresses/entities";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointment-failed-payment-cancel/appointment-failed-payment-cancel.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders-shared/appointment-orders-shared.module";
import { AppointmentOrdersWorkflowModule } from "src/modules/appointment-orders-workflow/appointment-orders-workflow.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentAdminInfo,
      AppointmentCancellationInfo,
      UserRole,
      ChimeMeetingConfiguration,
      AppointmentReminder,
      AppointmentRating,
      AppointmentEndDetail,
      Address,
    ]),
    AppointmentsSharedModule,
    AppointmentOrdersSharedModule,
    AppointmentOrdersWorkflowModule,
    forwardRef(() => ChimeMeetingConfigurationModule),
    NotificationModule,
    MultiWayParticipantModule,
    ChimeMessagingConfigurationModule,
    InterpreterProfileModule,
    DiscountsModule,
    BookingSlotManagementModule,
    MembershipsModule,
    PaymentsModule,
    AppointmentFailedPaymentCancelModule,
    HelperModule,
  ],
  controllers: [AppointmentsCommandController, AppointmentsQueryController],
  providers: [
    AppointmentCreateService,
    AppointmentUpdateService,
    AppointmentCancelService,
    AppointmentCommandService,
    AppointmentQueryService,
    AppointmentSchedulerService,
    AppointmentRatingService,
    AppointmentEndService,
    AppointmentNotificationService,
  ],
  exports: [
    AppointmentCreateService,
    AppointmentUpdateService,
    AppointmentCommandService,
    AppointmentQueryService,
    AppointmentSchedulerService,
    AppointmentCancelService,
  ],
})
export class AppointmentsModule {}
