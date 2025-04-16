import { EPossibleUiLanguage } from "src/modules/ui-languages/common/enums";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";

@Entity("ui_languages")
export class UiLanguage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @PrimaryColumn({ type: "enum", enum: EPossibleUiLanguage, name: "language" })
  language: EPossibleUiLanguage;

  @Column({ type: "varchar", name: "file", nullable: true })
  file: string | null;

  @VersionColumn({ type: "int", name: "version" })
  version: number;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
