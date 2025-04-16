import { Module } from "@nestjs/common";
import { EmailsService } from "src/modules/emails/services";
import { CustomMailerModule } from "src/modules/emails/custom-mailer";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [CustomMailerModule, RedisModule],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
