import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterpreterProfile, LanguagePair } from "src/modules/interpreter-profile/entities";
import { Company } from "src/modules/companies/entities";
import { ToolboxController } from "src/modules/toolbox/controllers";
import { ToolboxQueryOptionsService, ToolboxService } from "src/modules/toolbox/services";
import { User } from "src/modules/users/entities";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { Appointment } from "src/modules/appointments/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { Notification } from "src/modules/notifications/entities";
import { UserRole } from "src/modules/users-roles/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LanguagePair,
      Company,
      User,
      AppointmentOrder,
      ChannelMembership,
      Appointment,
      InterpreterProfile,
      Notification,
      UserRole,
    ]),
    HelperModule,
  ],
  controllers: [ToolboxController],
  providers: [ToolboxService, ToolboxQueryOptionsService],
  exports: [ToolboxService],
})
export class ToolboxModule {}
