import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { InterpreterQuestionnaire } from "src/modules/interpreter-questionnaire/entities";

@Entity("interpreter_recommendations")
export class InterpreterRecommendation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", name: "company_name" })
  companyName: string;

  @Column({ type: "varchar", name: "recommender_full_name" })
  recommenderFullName: string;

  @Column({ type: "varchar", name: "recommender_phone_number" })
  recommenderPhoneNumber: string;

  @Column({ type: "varchar", name: "recommender_email" })
  recommenderEmail: string;

  @RelationId((recommendation: InterpreterRecommendation) => recommendation.questionnaire)
  @Column({ type: "uuid", name: "questionnaire_id", nullable: false })
  questionnaireId: string;

  @ManyToOne(() => InterpreterQuestionnaire, (questionnaire) => questionnaire.recommendations, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "questionnaire_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "interpreter_recommendations_interpreter_questionnaires_FK",
  })
  questionnaire?: InterpreterQuestionnaire;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
