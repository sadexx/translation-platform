import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IeltsSdkService, IeltsService } from "src/modules/ielts/services";
import { IeltsController } from "src/modules/ielts/controllers";
import { IeltsCheck } from "src/modules/ielts/entities";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { MockModule } from "src/modules/mock/mock.module";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { InterpreterBadgeModule } from "src/modules/interpreter-badge/interpreter-badge.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([IeltsCheck, InterpreterProfile]),
    UsersRolesModule,
    ActivationTrackingModule,
    InterpreterProfileModule,
    MockModule,
    InterpreterBadgeModule,
  ],
  providers: [IeltsService, IeltsSdkService],
  controllers: [IeltsController],
})
export class IeltsModule {}
