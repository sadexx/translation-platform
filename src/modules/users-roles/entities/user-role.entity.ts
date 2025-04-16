import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "src/modules/roles/entities";
import { User, UserDocument, UserProfile } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { AbnCheck } from "src/modules/abn/entities";
import { Appointment } from "src/modules/appointments/entities";
import { DocusignContract } from "src/modules/docusign/entities";
import { EAccountStatus } from "src/modules/users-roles/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";
import { CustomInsurance, InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { NaatiProfile } from "src/modules/naati/entities";
import { IeltsCheck } from "src/modules/ielts/entities";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { COMPANY_LFH_FULL_NAME, COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Notification } from "src/modules/notifications/entities";
import { InterpreterQuestionnaire } from "src/modules/interpreter-questionnaire/entities";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { DiscountHolder } from "src/modules/discounts/entities/discount-holder.entity";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { Blacklist } from "src/modules/blacklists/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { Payment } from "src/modules/payments/entities";

@Entity({ name: "user_roles" })
@Index("users_roles_userId-roleId_IDX", ["userId", "roleId"], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", referencedColumnName: "id", foreignKeyConstraintName: "user_roles_users_FK" })
  user: User;

  @Column({ type: "uuid", name: "user_id", nullable: false })
  @RelationId((userRole: UserRole) => userRole.user)
  userId: string;

  @ManyToOne(() => Role, (role) => role.userRoles)
  @JoinColumn({ name: "role_id", referencedColumnName: "id", foreignKeyConstraintName: "user_roles_roles_FK" })
  role: Role;

  @Column({ type: "uuid", name: "role_id", nullable: false })
  @RelationId((userRole: UserRole) => userRole.role)
  roleId: string;

  @OneToOne(() => Address, (address) => address.userRole, { nullable: true })
  address: Address;

  @OneToOne(() => UserProfile, (userProfile) => userProfile.userRole)
  profile: UserProfile;

  @OneToOne(() => InterpreterProfile, (interpreterProfile) => interpreterProfile.userRole, { nullable: true })
  interpreterProfile?: InterpreterProfile;

  @OneToOne(() => CustomInsurance, (customInsurance) => customInsurance.userRole, { nullable: true })
  customInsurance?: CustomInsurance;

  @OneToMany(() => UserDocument, (document) => document.userRole)
  documents: UserDocument[];

  @OneToOne(() => InterpreterQuestionnaire, (questionnaire) => questionnaire.userRole, {
    nullable: true,
  })
  questionnaire?: InterpreterQuestionnaire;

  @OneToOne(() => SumSubCheck, (sumSub) => sumSub.userRole, { nullable: true })
  sumSubCheck?: SumSubCheck;

  @OneToOne(() => AbnCheck, (abnCheck) => abnCheck.userRole, { nullable: true })
  abnCheck?: AbnCheck;

  @OneToOne(() => NaatiProfile, (naatiProfile) => naatiProfile.userRole, { nullable: true })
  naatiProfile?: NaatiProfile;

  @OneToMany(() => DocusignContract, (contract) => contract.userRole, { nullable: true })
  docusignContracts?: DocusignContract[];

  @OneToOne(() => IeltsCheck, (ieltsCheck) => ieltsCheck.userRole, { nullable: true })
  ieltsCheck?: IeltsCheck;

  @OneToOne(() => BackyCheck, (backyCheck) => backyCheck.userRole, { nullable: true })
  backyCheck?: BackyCheck;

  @OneToOne(() => UserConcessionCard, (userConcessionCard) => userConcessionCard.userRole, { nullable: true })
  userConcessionCard?: UserConcessionCard;

  @OneToMany(() => LanguageDocCheck, (languageDocCheck) => languageDocCheck.userRole, { nullable: true })
  languageDocChecks?: LanguageDocCheck[];

  @OneToMany(() => RightToWorkCheck, (rightToWorkCheck) => rightToWorkCheck.userRole)
  rightToWorkChecks: RightToWorkCheck[];

  @OneToMany(() => DraftAppointment, (draftAppointment) => draftAppointment.client)
  clientDraftAppointments: DraftAppointment[];

  @OneToMany(() => Appointment, (appointment) => appointment.client)
  clientAppointments: Appointment[];

  @OneToMany(() => Appointment, (appointment) => appointment.interpreter)
  interpreterAppointments: Appointment[];

  @OneToMany(() => Notification, (notification) => notification.userRole)
  notifications: Notification[];

  @OneToOne(() => PaymentInformation, (paymentInformation) => paymentInformation.userRole, { nullable: true })
  paymentInformation?: PaymentInformation;

  @ManyToMany(() => Channel, (channel) => channel.userRoles, { onDelete: "CASCADE" })
  channels: Channel[];

  @OneToOne(() => DiscountHolder, (discountHolder) => discountHolder.userRole, { nullable: true })
  discountHolder: DiscountHolder | null;

  @OneToOne(() => MembershipAssignment, (membershipAssignment) => membershipAssignment.userRole, { nullable: true })
  membershipAssignment: MembershipAssignment | null;

  @OneToMany(() => Blacklist, (blacklist) => blacklist.blockedByUserRole)
  blockedByUserRoles: Blacklist[];

  @OneToMany(() => Blacklist, (blacklist) => blacklist.blockedUserRole)
  blockedUserRoles: Blacklist[];

  @OneToMany(() => Payment, (payment) => payment.fromClient)
  clientPayIns: Payment[];

  @OneToMany(() => Payment, (payment) => payment.toInterpreter)
  interpreterPayOuts: Payment[];

  @Column({ default: false, name: "is_user_agreed_to_terms_and_conditions" })
  isUserAgreedToTermsAndConditions: boolean;

  @Column({ default: false, name: "is_registration_finished" })
  isRegistrationFinished: boolean;

  @Column({ name: "is_required_info_fulfilled", type: "boolean", default: false })
  isRequiredInfoFulfilled: boolean;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive: boolean;

  @Column({
    type: "enum",
    enum: EAccountStatus,
    name: "account_status",
    default: EAccountStatus.REGISTERED,
  })
  accountStatus: EAccountStatus;

  @Column({ type: "uuid", name: "operated_by_company_id", default: COMPANY_LFH_ID })
  operatedByCompanyId: string;

  @Column({ type: "varchar", name: "operated_by_company_name", default: COMPANY_LFH_FULL_NAME })
  operatedByCompanyName: string;

  @Column({ type: "timestamptz", name: "invitation_link_was_created_at", nullable: true })
  invitationLinkWasCreatedAt: Date | null;

  @Column({ type: "timestamptz", name: "last_deactivation_date", nullable: true })
  lastDeactivationDate: Date | null;

  @Column({ name: "is_in_delete_waiting", type: "boolean", default: false })
  isInDeleteWaiting: boolean;

  @Column({ type: "timestamptz", name: "deleting_date", nullable: true })
  deletingDate: Date | null;

  @Column({ type: "uuid", name: "restoration_key", nullable: true })
  restorationKey: string | null;

  @Column({ type: "varchar", name: "country", nullable: true })
  country: string | null;

  @Column({ type: "varchar", name: "timezone", nullable: true })
  timezone: string | null;

  @Column({ type: "varchar", name: "instance_user_arn", nullable: true })
  instanceUserArn: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
