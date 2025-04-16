import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "src/modules/users/entities";
import { EPlatformType } from "src/modules/sessions/common/enum";

@Entity("sessions")
@Index("user_session_UQ", ["userId", "clientIPAddress", "clientUserAgent", "creationDate"], {
  unique: true,
})
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "user_id", nullable: false })
  userId: string;

  @Column({ type: "uuid", name: "user_role_id", nullable: false })
  userRoleId: string;

  @Column({
    type: "enum",
    enum: EPlatformType,
    name: "platform",
  })
  platform: EPlatformType;

  @Column({ type: "varchar", name: "device_id" })
  deviceId: string;

  @Column({ type: "varchar", name: "device_token", nullable: true })
  deviceToken: string | null;

  @Column({ type: "varchar", name: "ios_voip_token", nullable: true })
  iosVoipToken: string | null;

  @Column({ type: "varchar", name: "client_ip_address", nullable: false })
  clientIPAddress: string;

  @Column({ type: "varchar", name: "client_user_agent", nullable: false })
  clientUserAgent: string;

  @Column({ type: "varchar", name: "refresh_token", nullable: false })
  refreshToken: string;

  @Column({ type: "varchar", name: "first_stage_token", nullable: true })
  firstStageToken: string | null;

  @Column({ type: "timestamptz", name: "refresh_token_expiration_date", nullable: false })
  refreshTokenExpirationDate: Date;

  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "user_id",
    referencedColumnName: "id",
    foreignKeyConstraintName: "sessions_users_FK",
  })
  user: User;

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
