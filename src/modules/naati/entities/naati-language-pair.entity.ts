import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { NaatiInterpreter } from "src/modules/naati/entities";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";

@Entity("naati_language_pairs")
export class NaatiLanguagePair {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => NaatiInterpreter, (naatiInterpreter) => naatiInterpreter.languagePairs, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "naati_interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "naati_language_pairs_naati_interpreters_FK",
  })
  naatiInterpreter: NaatiInterpreter;

  @Column({ type: "enum", enum: EExtInterpreterLevel, name: "interpreter_level" })
  interpreterLevel: EExtInterpreterLevel;

  @Column({ type: "enum", enum: ELanguages, name: "language_from" })
  languageFrom: ELanguages;

  @Column({ type: "enum", enum: ELanguages, name: "language_to" })
  languageTo: ELanguages;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
