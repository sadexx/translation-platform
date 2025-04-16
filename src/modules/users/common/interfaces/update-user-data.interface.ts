import { EUserGender } from "src/modules/users/common/enums";

export interface IUpdateUserData {
  fullName?: string;
  email?: string;
  isEmailVerified?: boolean;
  phoneNumber?: string;
  isTwoStepVerificationEnabled?: boolean;
  password?: string;
  description?: string;
  dateOfBirth?: Date;
  gender?: EUserGender;
  location?: string;
  avatarUrl?: string | null;
  isDefaultAvatar?: boolean;
}
