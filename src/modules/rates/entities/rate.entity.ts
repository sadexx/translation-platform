import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ERateDetailsSequence, ERateDetailsTime, ERateQualifier, ERateTiming } from "src/modules/rates/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/common/enums";

@Entity("rates")
export class Rate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "integer", name: "quantity", nullable: false })
  quantity: number;

  @Column({
    type: "enum",
    enum: EAppointmentInterpreterType,
    name: "interpreter_type",
  })
  interpreterType: EAppointmentInterpreterType;

  @Column({
    type: "enum",
    enum: EAppointmentSchedulingType,
    name: "scheduling_type",
  })
  schedulingType: EAppointmentSchedulingType;

  @Column({
    type: "enum",
    enum: EAppointmentCommunicationType,
    name: "communication_type",
  })
  communicationType: EAppointmentCommunicationType;

  @Column({
    type: "enum",
    enum: EAppointmentInterpretingType,
    name: "interpreting_type",
  })
  interpretingType: EAppointmentInterpretingType;

  @Column({
    type: "enum",
    enum: ERateQualifier,
    name: "qualifier",
  })
  qualifier: ERateQualifier;

  @Column({
    type: "enum",
    enum: ERateTiming,
    name: "details",
  })
  details: ERateTiming;

  @Column({
    type: "enum",
    enum: ERateDetailsSequence,
    name: "details_sequence",
  })
  detailsSequence: ERateDetailsSequence;

  @Column({
    type: "enum",
    enum: ERateDetailsTime,
    name: "details_time",
  })
  detailsTime: ERateDetailsTime;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_general_with_gst", nullable: false })
  paidByTakerGeneralWithGst: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_general_without_gst", nullable: false })
  paidByTakerGeneralWithoutGst: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_special_with_gst", nullable: true })
  paidByTakerSpecialWithGst: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_by_taker_special_without_gst", nullable: true })
  paidByTakerSpecialWithoutGst: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "lfh_commission_general", nullable: false })
  lfhCommissionGeneral: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "lfh_commission_special", nullable: true })
  lfhCommissionSpecial: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_to_interpreter_general_with_gst", nullable: false })
  paidToInterpreterGeneralWithGst: string;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    name: "paid_to_interpreter_general_without_gst",
    nullable: false,
  })
  paidToInterpreterGeneralWithoutGst: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "paid_to_interpreter_special_with_gst", nullable: true })
  paidToInterpreterSpecialWithGst: string | null;

  @Column({
    type: "numeric",
    precision: 12,
    scale: 2,
    name: "paid_to_interpreter_special_without_gst",
    nullable: true,
  })
  paidToInterpreterSpecialWithoutGst: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
