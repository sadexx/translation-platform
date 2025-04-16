import { Exclude, Expose } from "class-transformer";
import { EInterpreterExperienceYears } from "src/modules/interpreter-questionnaire/common/enum";

export class QuestionnaireLanguageBuddyOutput {
  @Expose()
  id: string;

  @Exclude()
  userRoleId: string;

  @Exclude()
  experienceYears: EInterpreterExperienceYears;
}
