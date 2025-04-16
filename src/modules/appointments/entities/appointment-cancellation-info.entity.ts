import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AppointmentAdminInfo } from "src/modules/appointments/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";

@Entity("appointments_cancellation_info")
export class AppointmentCancellationInfo {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "cancelled_by_id" })
  cancelledById: string;

  @Column({ type: "varchar", name: "cancelled_by_platform_id" })
  cancelledByPlatformId: string;

  @Column({ type: "varchar", name: "cancelled_by_first_name" })
  cancelledByFirstName: string;

  @Column({
    type: "enum",
    name: "role_name",
    enum: EUserRoleName,
  })
  roleName: EUserRoleName;

  @Column({ type: "text", name: "cancellation_reason", nullable: true })
  cancellationReason: string | null;

  @ManyToOne(() => AppointmentAdminInfo, (appointmentAdminInfo) => appointmentAdminInfo.cancellations, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "appointment_admin_info_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointments_cancellation_info_appointments_admin_info_FK",
  })
  appointmentAdminInfo: AppointmentAdminInfo;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
