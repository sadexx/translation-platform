import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NaatiInterpreter, NaatiLanguagePair, NaatiProfile } from "src/modules/naati/entities";
import { NaatiService, NaatiWebScraperService } from "src/modules/naati/services";
import { NaatiController } from "src/modules/naati/controllers";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { MockModule } from "src/modules/mock/mock.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([NaatiInterpreter, NaatiLanguagePair, NaatiProfile]),
    InterpreterProfileModule,
    MockModule,
    ActivationTrackingModule,
    EmailsModule,
    UsersRolesModule,
    HelperModule,
  ],
  providers: [NaatiService, NaatiWebScraperService],
  controllers: [NaatiController],
  exports: [],
})
export class NaatiModule {}
