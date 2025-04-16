import { Appointment } from "src/modules/appointments/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("incoming_payments_wait_list")
export class IncomingPaymentsWaitList {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Appointment, (appointment) => appointment.incomingPaymentsWaitList, { onDelete: "SET NULL" })
  @JoinColumn({
    name: "appointment_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "incoming_payments_wait_list_appointments_FK",
  })
  appointment: Appointment;

  @Column({ type: "integer", name: "payment_attempt_count", default: 0 })
  paymentAttemptCount: number;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
