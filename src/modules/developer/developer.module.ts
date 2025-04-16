import { Module } from "@nestjs/common";
import { DeveloperSdkService, DeveloperService } from "src/modules/developer/services";
import { DeveloperController } from "src/modules/developer/controllers";
import { JwtRegistrationModule } from "src/modules/tokens/common/libs/registration-token";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { DocusignContract } from "src/modules/docusign/entities";

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, DocusignContract]), JwtRegistrationModule],
  providers: [DeveloperService, DeveloperSdkService],
  controllers: [DeveloperController],
})
export class DeveloperModule {}
