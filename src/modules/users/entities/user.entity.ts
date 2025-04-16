import { Exclude } from "class-transformer";
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Session } from "src/modules/sessions/entities";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";

@Entity("users")
@Index("users_email_IDX", ["email"], { unique: true })
@Index("users_phoneNumber_IDX", ["phoneNumber"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string;

  @Column()
  email: string;

  @Column({ name: "is_email_verified", type: "boolean", default: false })
  isEmailVerified: boolean;

  @Column({ name: "phone_number", nullable: true })
  phoneNumber: string;

  @Column({
    name: "is_two_step_verification_enabled",
    type: "boolean",
    default: false,
  })
  isTwoStepVerificationEnabled: boolean;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @Column({ name: "is_registration_finished", type: "boolean", default: false })
  isRegistrationFinished: boolean;

  @Column({ name: "is_default_avatar", type: "boolean", default: false })
  isDefaultAvatar: boolean;

  @Column({ type: "varchar", name: "avatar_url", nullable: true })
  avatarUrl: string | null;

  @OneToOne(() => UserAvatarRequest, (avatar) => avatar.user, { nullable: true })
  avatar?: UserAvatarRequest | null;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToOne(() => Company, (company) => company.superAdmin, { nullable: true, onDelete: "CASCADE" })
  administratedCompany?: Company;

  @OneToMany(() => UserRole, (userRoles) => userRoles.user, { cascade: ["insert", "update", "remove"] })
  userRoles: UserRole[];

  @OneToMany(() => ChannelMembership, (membership) => membership.user, { cascade: true, nullable: true })
  memberships?: ChannelMembership[] | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date", default: new Date() })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date", default: new Date() })
  updatingDate: Date;

  @BeforeUpdate()
  @BeforeInsert()
  async setPlatformId(): Promise<void> {
    if (this.isRegistrationFinished && !this.platformId) {
      this.platformId = await setPlatformId(ESequenceName.CUSTOMER);
    }
  }
}
