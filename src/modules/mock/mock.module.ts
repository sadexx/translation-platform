import { Module } from "@nestjs/common";
import { MockService } from "src/modules/mock/services";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtEmailConfirmationModule } from "src/modules/tokens/common/libs/email-confirmation-token";
import { BackyCheck } from "src/modules/backy-check/entities";
import { DocusignContract } from "src/modules/docusign/entities";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";

@Module({
  imports: [TypeOrmModule.forFeature([BackyCheck, DocusignContract]), JwtEmailConfirmationModule, UsersRolesModule],
  providers: [MockService],
  exports: [MockService],
})
export class MockModule {}
