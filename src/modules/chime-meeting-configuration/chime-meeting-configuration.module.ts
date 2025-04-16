import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsChimeSdkModule } from "src/modules/aws-chime-sdk/aws-chime-sdk.module";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { ChimeMeetingConfigurationController } from "src/modules/chime-meeting-configuration/controllers";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import {
  AttendeeCreationService,
  AttendeeManagementService,
  ChimeMeetingQueryService,
  MeetingClosingService,
  MeetingCreationService,
  MeetingJoinService,
  SipMediaService,
} from "src/modules/chime-meeting-configuration/services";
import { UserRole } from "src/modules/users-roles/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { AppointmentsModule } from "src/modules/appointments/appointments.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders-shared/appointment-orders-shared.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { PaymentsModule } from "src/modules/payments/payments.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ChimeMeetingConfiguration, Attendee, UserRole, MultiWayParticipant]),
    AwsS3Module,
    AwsChimeSdkModule,
    AppointmentOrdersSharedModule,
    AppointmentsModule,
    DiscountsModule,
    PaymentsModule,
    HelperModule,
  ],
  providers: [
    MeetingCreationService,
    AttendeeCreationService,
    MeetingJoinService,
    AttendeeManagementService,
    SipMediaService,
    MeetingClosingService,
    ChimeMeetingQueryService,
  ],
  controllers: [ChimeMeetingConfigurationController],
  exports: [
    MeetingCreationService,
    AttendeeCreationService,
    MeetingJoinService,
    AttendeeManagementService,
    MeetingClosingService,
  ],
})
export class ChimeMeetingConfigurationModule {}
