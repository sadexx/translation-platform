import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserRole } from "src/modules/users-roles/entities";
import { UsersRolesService } from "src/modules/users-roles/services";
import { RolesModule } from "src/modules/roles/roles.module";

@Module({
  imports: [TypeOrmModule.forFeature([UserRole]), RolesModule],
  providers: [UsersRolesService],
  exports: [UsersRolesService],
})
export class UsersRolesModule {}
