import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CsvBuilderService, CsvQueryService, CsvService } from "src/modules/csv/services";
import { Appointment } from "src/modules/appointments/entities";
import { CsvController } from "src/modules/csv/controllers";
import { User } from "src/modules/users/entities";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { ContactForm } from "../contact-form/entities";
import { CsvQueueStorageService } from "src/modules/csv/common/storages";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, User, DraftAppointment, Company, UserRole, ContactForm]),
    HelperModule,
  ],
  controllers: [CsvController],
  providers: [CsvService, CsvBuilderService, CsvQueryService, CsvQueueStorageService],
  exports: [CsvService],
})
export class CsvModule {}
