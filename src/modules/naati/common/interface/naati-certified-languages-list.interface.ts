import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { INaatiCertifiedLanguages } from "src/modules/naati/common/interface";

export interface INaatiCertifiedLanguagesList {
  primaryLanguage: ELanguages;
  certifiedLanguages: INaatiCertifiedLanguages[];
}
