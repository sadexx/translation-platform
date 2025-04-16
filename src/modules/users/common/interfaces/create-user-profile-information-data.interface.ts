import { EUserGender, EUserTitle } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";

export interface ICreateUserProfileInformationData {
  title?: EUserTitle;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: EUserGender;
  contactEmail?: string;
  nativeLanguage?: ELanguages;
  isIdentifyAsAboriginalOrTorresStraitIslander?: boolean;
}
