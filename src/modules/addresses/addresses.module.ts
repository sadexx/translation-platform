import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Address } from "src/modules/addresses/entities";
import { AddressesService } from "src/modules/addresses/services";
import { AddressesController } from "src/modules/addresses/controllers";
import { AppointmentsModule } from "src/modules/appointments/appointments.module";

@Module({
  imports: [TypeOrmModule.forFeature([Address]), AppointmentsModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
