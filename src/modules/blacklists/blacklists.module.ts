import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Blacklist } from "src/modules/blacklists/entities";
import { BlacklistsController } from "src/modules/blacklists/controllers";
import { BlacklistService } from "src/modules/blacklists/services";
import { Appointment } from "src/modules/appointments/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Blacklist, Appointment])],
  controllers: [BlacklistsController],
  providers: [BlacklistService],
  exports: [],
})
export class BlacklistModule {}
