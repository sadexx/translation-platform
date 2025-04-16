import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HelperService } from "src/modules/helper/services";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { DiscountHolder } from "src/modules/discounts/entities";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/entities";
import { User } from "src/modules/users/entities";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { Session } from "src/modules/sessions/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      Company,
      DiscountHolder,
      Appointment,
      AppointmentAdminInfo,
      AppointmentReminder,
      InterpreterProfile,
      Session,
      ChimeMeetingConfiguration,
    ]),
  ],
  providers: [HelperService],
  exports: [HelperService],
})
export class HelperModule {}
