import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomInsurance, InterpreterProfile, LanguagePair } from "src/modules/interpreter-profile/entities";
import { InterpreterProfileController } from "src/modules/interpreter-profile/controllers";
import { InterpreterProfileService } from "src/modules/interpreter-profile/services";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { InterpreterBadgeModule } from "src/modules/interpreter-badge/interpreter-badge.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterProfile, LanguagePair, CustomInsurance]),
    ActivationTrackingModule,
    UsersRolesModule,
    InterpreterBadgeModule,
    HelperModule,
  ],
  controllers: [InterpreterProfileController],
  providers: [InterpreterProfileService],
  exports: [InterpreterProfileService],
})
export class InterpreterProfileModule {}
