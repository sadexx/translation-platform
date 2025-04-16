import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { UserRole } from "src/modules/users-roles/entities";
import { Method } from "src/modules/permissions/entities";

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    name: "role",
    type: "enum",
    enum: EUserRoleName,
    unique: true,
  })
  name: EUserRoleName;

  @OneToMany(() => UserRole, (userRoles) => userRoles.role)
  userRoles: UserRole[];

  @OneToMany(() => Method, (method) => method.role, { cascade: ["insert", "update", "remove"] })
  methods: Method[];

  @CreateDateColumn({ type: "timestamptz", name: "creation_date" })
  creationDate: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updating_date" })
  updatingDate: Date;
}
