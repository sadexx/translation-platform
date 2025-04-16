import { Exclude, Expose } from "class-transformer";
import { EInterpreterExperienceYears } from "src/modules/interpreter-questionnaire/common/enum";

export class QuestionnaireOutput {
  @Expose()
  id: string;

  @Exclude()
  userRoleId: string;

  @Expose()
  experienceYears: EInterpreterExperienceYears;
}
