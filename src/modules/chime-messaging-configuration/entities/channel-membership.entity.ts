import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EChannelMembershipType } from "src/modules/chime-messaging-configuration/common/enums";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { User } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";

@Entity("channel_memberships")
export class ChannelMembership {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", name: "external_user_id", nullable: false })
  externalUserId: string;

  @Column({ type: "varchar", name: "user_platform_id", nullable: false })
  userPlatformId: string;

  @Column({ type: "varchar", name: "instance_user_arn", nullable: true })
  instanceUserArn: string | null;

  @Column({ type: "enum", enum: EChannelMembershipType, default: EChannelMembershipType.MEMBER, nullable: false })
  type: EChannelMembershipType;

  @Column({ type: "varchar", name: "name", nullable: false })
  name: string;

  @Column({
    type: "enum",
    name: "role_name",
    enum: EUserRoleName,
  })
  roleName: EUserRoleName;

  @Column({ type: "int", name: "unread_messages_count", default: 0 })
  unreadMessagesCount: number;

  @ManyToOne(() => Channel, (channel) => channel.memberships, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "channel_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "channel_memberships_channels_FK",
  })
  channel: Channel;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: "SET NULL" })
  @JoinColumn({
    name: "user_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "channel_memberships_users_FK",
  })
  user: User;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
