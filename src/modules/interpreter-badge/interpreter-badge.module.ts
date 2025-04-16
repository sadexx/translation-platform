import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { InterpreterBadgeService } from "src/modules/interpreter-badge/services";
import { AwsS3Module } from "src/modules/aws-s3/aws-s3.module";
import { PdfModule } from "src/modules/pdf/pdf.module";
import { InterpreterBadgeController } from "src/modules/interpreter-badge/controllers";

@Module({
  imports: [TypeOrmModule.forFeature([InterpreterProfile]), PdfModule, AwsS3Module],
  controllers: [InterpreterBadgeController],
  providers: [InterpreterBadgeService],
  exports: [InterpreterBadgeService],
})
export class InterpreterBadgeModule {}
