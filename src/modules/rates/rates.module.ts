import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RatesPriceService, RatesService } from "src/modules/rates/services";
import { RatesController } from "src/modules/rates/controllers";
import { Rate } from "src/modules/rates/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Rate])],
  providers: [RatesService, RatesPriceService],
  controllers: [RatesController],
  exports: [RatesService],
})
export class RatesModule {}
