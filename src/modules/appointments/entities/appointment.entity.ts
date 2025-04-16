import { Exclude } from "class-transformer";
import { ESequenceName } from "src/common/enums";
import { setPlatformId } from "src/common/utils";
import { Address } from "src/modules/addresses/entities";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/common/enums";
import {
  AppointmentAdminInfo,
  AppointmentEndDetail,
  AppointmentRating,
  AppointmentReminder,
} from "src/modules/appointments/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { EUserGender } from "src/modules/users/common/enums";
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { DiscountAssociation } from "src/modules/discounts/entities";
import { Blacklist } from "src/modules/blacklists/entities";
import { IncomingPaymentsWaitList, Payment } from "src/modules/payments/entities";
import { ECurrencies } from "src/modules/payments/common/enums";

@Entity({ name: "appointments" })
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string;

  /**
   *? Individual Client
   */

  @Exclude()
  @Column({ type: "uuid", name: "client_id", nullable: true })
  @RelationId((appointment: Appointment) => appointment.client)
  clientId: string | null;

  @ManyToOne(() => UserRole, (client) => client.clientAppointments, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({
    name: "client_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointments_clients_FK",
  })
  client?: UserRole | null;

  @Column({ type: "boolean", name: "archived_by_client", default: false })
  archivedByClient: boolean;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "paid_by_client", default: 0 })
  paidByClient: number;

  @Column({
    type: "enum",
    enum: ECurrencies,
    name: "client_currency",
    nullable: true,
  })
  clientCurrency: ECurrencies | null;

  /**
   *? Interpreter: Individual, Language Buddy
   */

  @Exclude()
  @Column({ type: "uuid", name: "interpreter_id", nullable: true })
  @RelationId((appointment: Appointment) => appointment.interpreter)
  interpreterId: string | null;

  @ManyToOne(() => UserRole, (interpreter) => interpreter.interpreterAppointments, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({
    name: "interpreter_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "appointments_interpreters_FK",
  })
  interpreter?: UserRole | null;

  @Column({ type: "boolean", name: "archived_by_interpreter", default: false })
  archivedByInterpreter: boolean;

  @Column({ type: "decimal", precision: 12, scale: 2, name: "received_by_interpreter", default: 0 })
  receivedByInterpreter: number;

  @Column({
    type: "enum",
    enum: ECurrencies,
    name: "interpreter_currency",
    nullable: true,
  })
  interpreterCurrency: ECurrencies | null;

  /**
   *? Relations Fields
   */

  @OneToOne(() => AppointmentOrder, (appointmentOrder) => appointmentOrder.appointment, { nullable: true })
  appointmentOrder: AppointmentOrder;

  @OneToOne(() => ChimeMeetingConfiguration, (chimeMeetingConfiguration) => chimeMeetingConfiguration.appointment, {
    nullable: true,
  })
  chimeMeetingConfiguration?: ChimeMeetingConfiguration;

  @OneToMany(() => MultiWayParticipant, (participant) => participant.appointment)
  participants?: MultiWayParticipant[];

  @OneToOne(() => Address, (address) => address.appointment, { nullable: true })
  address?: Address;

  @OneToOne(() => AppointmentEndDetail, (appointmentEndDetail) => appointmentEndDetail.appointment, {
    nullable: true,
  })
  appointmentEndDetail?: AppointmentEndDetail | null;

  @OneToOne(() => AppointmentAdminInfo, (appointmentAdminInfo) => appointmentAdminInfo.appointment, {
    nullable: true,
  })
  appointmentAdminInfo?: AppointmentAdminInfo;

  @OneToOne(() => AppointmentReminder, (appointmentReminder) => appointmentReminder.appointment, {
    cascade: true,
    nullable: true,
  })
  appointmentReminder: AppointmentReminder;

  @OneToOne(() => AppointmentRating, (appointmentRating) => appointmentRating.appointment, {
    cascade: true,
    nullable: true,
  })
  appointmentRating: AppointmentRating | null;

  @OneToOne(() => DiscountAssociation, (discountAssociation) => discountAssociation.appointment, { nullable: true })
  discountAssociation?: DiscountAssociation | null;

  @OneToMany(() => Blacklist, (blacklist) => blacklist.appointment)
  blacklists?: Blacklist[];

  @OneToOne(() => IncomingPaymentsWaitList, (incomingPaymentsWaitList) => incomingPaymentsWaitList.appointment, {
    cascade: true,
    nullable: true,
  })
  incomingPaymentsWaitList: IncomingPaymentsWaitList | null;

  @OneToMany(() => Payment, (payment) => payment.appointment)
  payments?: Payment[];

  /**
   ** Public Fields
   */

  @Column({ type: "timestamptz", name: "scheduled_start_time" })
  scheduledStartTime: Date;

  @Column({ type: "timestamptz", name: "scheduled_end_time" })
  scheduledEndTime: Date;

  @Column({
    type: "enum",
    enum: EAppointmentCommunicationType,
    name: "communication_type",
  })
  communicationType: EAppointmentCommunicationType;

  @Column({
    type: "enum",
    enum: EAppointmentSchedulingType,
    name: "scheduling_type",
  })
  schedulingType: EAppointmentSchedulingType;

  @Column({ type: "integer", name: "scheduling_duration" })
  schedulingDurationMin: number;

  @Column({
    type: "enum",
    enum: EAppointmentTopic,
    name: "topic",
  })
  topic: EAppointmentTopic;

  @Column({
    type: "enum",
    enum: EUserGender,
    name: "preferred_interpreter_gender",
    nullable: true,
  })
  preferredInterpreterGender: EUserGender | null;

  @Column({
    type: "enum",
    enum: EAppointmentInterpreterType,
    name: "interpreter_type",
  })
  interpreterType: EAppointmentInterpreterType;

  @Column({
    type: "enum",
    enum: EAppointmentInterpretingType,
    name: "interpreting_type",
  })
  interpretingType: EAppointmentInterpretingType;

  @Column({
    type: "enum",
    enum: EAppointmentSimultaneousInterpretingType,
    name: "simultaneous_interpreting_type",
    nullable: true,
  })
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType | null;

  @Column({
    type: "enum",
    enum: ELanguages,
    name: "language_from",
  })
  languageFrom: ELanguages;

  @Column({
    type: "enum",
    enum: ELanguages,
    name: "language_to",
  })
  languageTo: ELanguages;

  @Column({
    type: "enum",
    enum: EAppointmentParticipantType,
    name: "participant_type",
  })
  participantType: EAppointmentParticipantType;

  @Column({ type: "boolean", name: "alternative_platform", default: false })
  alternativePlatform: boolean;

  @Column({
    type: "varchar",
    name: "alternative_video_conferencing_platform_link",
    nullable: true,
  })
  alternativeVideoConferencingPlatformLink?: string | null;

  @Column({ type: "text", name: "notes", nullable: true })
  notes: string | null;

  @Column({ type: "boolean", name: "scheduling_extra_day" })
  schedulingExtraDay: boolean;

  @Column({
    type: "enum",
    enum: EAppointmentStatus,
    name: "status",
    default: EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION,
  })
  status: EAppointmentStatus;

  @Column({ type: "timestamptz", name: "business_end_time", nullable: true })
  businessEndTime: Date | null;

  @Column({ type: "timestamptz", name: "client_last_active_time", nullable: true })
  clientLastActiveTime: Date | null;

  @Column({ type: "boolean", name: "is_group_appointment", default: false })
  isGroupAppointment: boolean;

  @Column({ type: "varchar", name: "appointments_group_id", nullable: true })
  appointmentsGroupId: string | null;

  @Column({ type: "boolean", name: "same_interpreter", default: false })
  sameInterpreter: boolean;

  @Column({ type: "uuid", name: "channel_id", nullable: true })
  channelId: string | null;

  @Column({ type: "varchar", name: "operated_by_company_name" })
  operatedByCompanyName: string;

  @Column({ type: "uuid", name: "operated_by_company_id" })
  operatedByCompanyId: string;

  @Column({ type: "boolean", name: "accept_overtime_rates" })
  acceptOvertimeRates: boolean;

  @Column({ type: "varchar", name: "timezone" })
  timezone: string;

  @Column({ type: "timestamptz", name: "accepted_date", nullable: true })
  acceptedDate: Date;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    this.platformId = await setPlatformId(ESequenceName.APPOINTMENT);
  }
}
