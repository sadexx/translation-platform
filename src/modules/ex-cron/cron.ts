import { NestFactory } from "@nestjs/core";
import { SingleLokiLogger } from "src/common/logger";
import { CronModule } from "src/modules/ex-cron/cron.module";

export async function cronsStart(): Promise<void> {
  await NestFactory.createApplicationContext(CronModule);

  SingleLokiLogger.log("Crons started");
}
