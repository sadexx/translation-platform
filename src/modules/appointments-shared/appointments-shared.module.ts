import { Module } from "@nestjs/common";
import { AppointmentQueryOptionsService } from "src/modules/appointments-shared/services";

@Module({
  providers: [AppointmentQueryOptionsService],
  exports: [AppointmentQueryOptionsService],
})
export class AppointmentsSharedModule {}
