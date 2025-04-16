import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { InterpreterQuestionnaire, InterpreterRecommendation } from "src/modules/interpreter-questionnaire/entities";
import {
  InterpreterQuestionnaireController,
  InterpreterRecommendationController,
} from "src/modules/interpreter-questionnaire/controllers";
import {
  InterpreterQuestionnaireService,
  InterpreterRecommendationsService,
} from "src/modules/interpreter-questionnaire/services";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterQuestionnaire, InterpreterRecommendation]),
    UsersRolesModule,
    ActivationTrackingModule,
    InterpreterProfileModule,
    HelperModule,
  ],
  controllers: [InterpreterQuestionnaireController, InterpreterRecommendationController],
  providers: [InterpreterQuestionnaireService, InterpreterRecommendationsService],
  exports: [InterpreterQuestionnaireService],
})
export class InterpreterQuestionnaireModule {}
