import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RemovalService } from "src/modules/removal/services";
import { Company } from "src/modules/companies/entities";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { InterpreterBadgeModule } from "src/modules/interpreter-badge/interpreter-badge.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [TypeOrmModule.forFeature([Company, User, UserRole]), InterpreterBadgeModule, HelperModule],
  providers: [RemovalService],
  exports: [RemovalService],
})
export class RemovalModule {}
