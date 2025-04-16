import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { AdminQueryOptionsService, AdminService } from "src/modules/admin/services";
import { AdminController } from "src/modules/admin/controllers";
import { UserRole } from "src/modules/users-roles/entities";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { Payment } from "src/modules/payments/entities";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, InterpreterProfile, Payment]), AccountActivationModule],
  providers: [AdminService, AdminQueryOptionsService],
  controllers: [AdminController],
})
export class AdminModule {}
