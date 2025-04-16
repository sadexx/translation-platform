import { EUserRoleName } from "src/modules/roles/common/enums";

export interface IInvitedParticipant {
  id: string;
  name: string;
  role: { name: EUserRoleName };
}
