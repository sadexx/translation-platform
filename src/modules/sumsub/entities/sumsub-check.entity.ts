import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import {
  EExtSumSubApplicantType,
  EExtSumSubLevelName,
  EExtSumSubReviewAnswer,
  EExtSumSubReviewRejectType,
  EExtSumSubReviewStatus,
  EExtSumSubWebhookType,
} from "src/modules/sumsub/common/enums";
import { UserRole } from "src/modules/users-roles/entities";

@Entity("sumsub_checks")
export class SumSubCheck {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => UserRole, (userRole) => userRole.sumSubCheck, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "sumsub_checks_user_roles_FK",
  })
  userRole: UserRole;

  @Column({ type: "varchar", name: "applicant_id" })
  applicantId: string;

  @Column({ type: "varchar", name: "inspection_id" })
  inspectionId: string;

  @Column({ type: "enum", enum: EExtSumSubApplicantType, name: "applicant_type" })
  applicantType: EExtSumSubApplicantType;

  @Column({ type: "varchar", name: "correlation_id" })
  correlationId: string;

  @Column({ type: "enum", enum: EExtSumSubLevelName, name: "level_name" })
  levelName: EExtSumSubLevelName;

  @Column({ type: "uuid", name: "external_user_id" })
  externalUserId: string;

  @Column({ type: "enum", enum: EExtSumSubWebhookType, name: "webhook_type" })
  webhookType: EExtSumSubWebhookType;

  @Column({ type: "enum", enum: EExtSumSubReviewStatus, name: "review_status" })
  reviewStatus: EExtSumSubReviewStatus;

  @Column({ type: "text", name: "moderation_comment", nullable: true })
  moderationComment?: string | null;

  @Column({ type: "text", name: "client_comment", nullable: true })
  clientComment?: string | null;

  @Column({ type: "enum", enum: EExtSumSubReviewAnswer, name: "review_answer", nullable: true })
  reviewAnswer?: EExtSumSubReviewAnswer | null;

  @Column({ name: "reject_labels", type: "jsonb", nullable: true })
  rejectLabels?: string[] | null;

  @Column({ type: "enum", enum: EExtSumSubReviewRejectType, name: "review_reject_type", nullable: true })
  reviewRejectType?: EExtSumSubReviewRejectType | null;

  @Column({ type: "jsonb", name: "button_ids", nullable: true })
  buttonIds?: string[] | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
