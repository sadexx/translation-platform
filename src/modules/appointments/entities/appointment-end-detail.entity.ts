import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Appointment } from "src/modules/appointments/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";

@Entity({ name: "appointment_end_details" })
export class AppointmentEndDetail {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "timestamptz", name: "client_alternative_scheduled_start_time", nullable: true })
  clientAlternativeScheduledStartTime: Date | null;

  @Column({ type: "timestamptz", name: "client_alternative_scheduled_end_time", nullable: true })
  clientAlternativeScheduledEndTime: Date | null;

  @Column({ type: "timestamptz", name: "interpreter_alternative_scheduled_start_time", nullable: true })
  interpreterAlternativeScheduledStartTime: Date | null;

  @Column({ type: "timestamptz", name: "interpreter_alternative_scheduled_end_time", nullable: true })
  interpreterAlternativeScheduledEndTime: Date | null;

  @Column({ type: "timestamptz", name: "admin_alternative_scheduled_start_time", nullable: true })
  adminAlternativeScheduledStartTime: Date | null;

  @Column({ type: "timestamptz", name: "admin_alternative_scheduled_end_time", nullable: true })
  adminAlternativeScheduledEndTime: Date | null;

  @Column({ type: "text", name: "client_signature", nullable: true })
  clientSignature: string | null;

  @Column({ type: "text", name: "interpreter_signature", nullable: true })
  interpreterSignature: string | null;

  @Column({ type: "text", name: "admin_signature", nullable: true })
  adminSignature: string | null;

  @Column({ type: "boolean", name: "client_time_updated", default: false })
  clientTimeUpdated: boolean;

  @Column({ type: "boolean", name: "interpreter_time_updated", default: false })
  interpreterTimeUpdated: boolean;

  @Column({ type: "boolean", name: "is_client_time_latest", default: false })
  isClientTimeLatest: boolean;

  @Column({
    type: "enum",
    name: "admin_role_name",
    enum: EUserRoleName,
    nullable: true,
  })
  adminRoleName: EUserRoleName | null;

  @Column({ type: "varchar", name: "admin_first_name", nullable: true })
  adminFirstName?: string | null;

  @Column({ type: "varchar", name: "admin_platform_id", nullable: true })
  adminPlatformId?: string | null;

  @OneToOne(() => Appointment, (appointment) => appointment.appointmentEndDetail, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointment_end_details_appointments_FK",
  })
  appointment: Appointment;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
