import { Module } from "@nestjs/common";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { SumSubSdkService, SumSubService } from "src/modules/sumsub/services";
import { SumSubController } from "src/modules/sumsub/controllers";

@Module({
  imports: [TypeOrmModule.forFeature([SumSubCheck]), ActivationTrackingModule, UsersRolesModule],
  controllers: [SumSubController],
  providers: [SumSubService, SumSubSdkService],
  exports: [SumSubService, SumSubSdkService],
})
export class SumSubModule {}
