import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EChannelStatus, EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { setPlatformId } from "src/common/utils";
import { ESequenceName } from "src/common/enums";
import { UserRole } from "src/modules/users-roles/entities";

@Entity("channels")
export class Channel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "platform_id",
    type: "varchar",
    nullable: true,
    unique: true,
  })
  platformId: string;

  @Column({ type: "varchar", name: "channel_arn", nullable: true })
  channelArn: string | null;

  @Column({ type: "enum", enum: EChannelType, nullable: false })
  type: EChannelType;

  @Column({ type: "enum", enum: EChannelStatus, nullable: false })
  status: EChannelStatus;

  @Column({ type: "varchar", name: "appointment_id", nullable: true })
  appointmentId: string | null;

  @Column({ type: "varchar", name: "appointments_group_id", nullable: true })
  appointmentsGroupId: string | null;

  @Column({ type: "varchar", name: "appointment_platform_id", nullable: true })
  appointmentPlatformId: string | null;

  @Column({ type: "text", array: true, name: "file_keys", nullable: true })
  fileKeys: string[] | null;

  @OneToMany(() => ChannelMembership, (membership) => membership.channel, { onDelete: "CASCADE" })
  memberships: ChannelMembership[];

  @ManyToMany(() => UserRole, (userRole) => userRole.channels)
  @JoinTable({
    name: "channels_user_roles",
    joinColumn: {
      name: "channel_id",
      referencedColumnName: "id",
      foreignKeyConstraintName: "channels_user_roles_FK",
    },
    inverseJoinColumn: {
      name: "user_role_id",
      referencedColumnName: "id",
      foreignKeyConstraintName: "user_roles_channels_FK",
    },
  })
  userRoles: UserRole[];

  @Column({ type: "timestamptz", name: "resolved_date", nullable: true })
  resolvedDate: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;

  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    this.platformId = await setPlatformId(ESequenceName.CHANNEL);
  }
}
