import { ELandingPart } from "src/modules/content-management/common/enums";
import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";

export interface IFolderAdditionalParams {
  id?: string;
  role?: string;
  documentType?: string;
  landingPart?: ELandingPart;
  channelType?: EChannelType;
}
