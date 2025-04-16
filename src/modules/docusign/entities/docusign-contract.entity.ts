import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "src/modules/users-roles/entities";
import { EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { Company } from "src/modules/companies/entities";

@Entity("docusign_contracts")
export class DocusignContract {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "envelope_id" })
  envelopeId: string;

  @Column({ type: "enum", enum: EExtDocusignStatus, name: "docusign_status", nullable: true })
  docusignStatus?: EExtDocusignStatus;

  @Column({ type: "timestamptz", name: "send_date", nullable: true })
  sendDate: Date;

  @Column({ type: "timestamptz", name: "sign_date", nullable: true })
  signDate: Date;

  @Column({ type: "varchar", name: "s3_contract_key", nullable: true })
  s3ContractKey: string;

  @Column({ type: "boolean", name: "signatories_was_changed", default: false })
  signatoriesWasChanged: boolean;

  @Column({ type: "boolean", name: "is_at_least_one_signers_signed", default: false })
  isAtLeastOneSignersSigned: boolean;

  @ManyToOne(() => UserRole, (userRole) => userRole.docusignContracts, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "user_role_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "docusign_contracts_users_roles_FK",
  })
  userRole?: UserRole;

  @OneToOne(() => Company, (company) => company.contract, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "company_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "docusign_contracts_companies_FK",
  })
  company?: Company;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
