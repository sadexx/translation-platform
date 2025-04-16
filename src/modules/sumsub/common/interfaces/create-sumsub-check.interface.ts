import { UserRole } from "src/modules/users-roles/entities";
import {
  EExtSumSubApplicantType,
  EExtSumSubLevelName,
  EExtSumSubReviewAnswer,
  EExtSumSubReviewRejectType,
  EExtSumSubReviewStatus,
  EExtSumSubWebhookType,
} from "src/modules/sumsub/common/enums";

export interface ICreateSumSubCheck {
  userRole: UserRole;
  applicantId: string;
  inspectionId: string;
  applicantType: EExtSumSubApplicantType;
  correlationId: string;
  levelName: EExtSumSubLevelName;
  externalUserId: string;
  webhookType: EExtSumSubWebhookType;
  reviewStatus: EExtSumSubReviewStatus;
  moderationComment: string | null;
  clientComment: string | null;
  reviewAnswer: EExtSumSubReviewAnswer | null;
  rejectLabels: string[] | null;
  reviewRejectType: EExtSumSubReviewRejectType | null;
  buttonIds: string[] | null;
}
