import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "src/modules/users-roles/entities";
import { EInterpreterExperienceYears } from "src/modules/interpreter-questionnaire/common/enum";
import { InterpreterRecommendation } from "src/modules/interpreter-questionnaire/entities";

@Entity("interpreter_questionnaires")
export class InterpreterQuestionnaire {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: EInterpreterExperienceYears,
    name: "interpreter_experience_years",
    nullable: true,
  })
  experienceYears: EInterpreterExperienceYears;

  @OneToOne(() => UserRole, (userRole) => userRole.questionnaire, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "interpreter_questionnaires_user_roles_FK",
  })
  userRole: UserRole;

  @Column({ name: "user_role_id", nullable: false })
  @RelationId((interpreterQuestionnaire: InterpreterQuestionnaire) => interpreterQuestionnaire.userRole)
  userRoleId: string;

  @OneToMany(
    () => InterpreterRecommendation,
    (interpreterRecommendations) => interpreterRecommendations.questionnaire,
    {
      nullable: true,
    },
  )
  recommendations?: InterpreterRecommendation[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
