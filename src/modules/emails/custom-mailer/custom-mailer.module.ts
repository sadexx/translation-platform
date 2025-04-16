import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import SMTPPool from "nodemailer/lib/smtp-pool";
import { join } from "path";
import { SMTP_SECURE_PORT } from "src/common/constants";
import { CustomMailerService } from "src/modules/emails/custom-mailer/custom-mailer.service";
import { MAILER_TRANSPORT } from "src/modules/emails/common/constants";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAILER_TRANSPORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Transporter<SMTPPool.MailOptions> => {
        const transporter = createTransport({
          host: configService.getOrThrow<string>("EMAIL_HOST"),
          port: configService.getOrThrow<number>("EMAIL_PORT"),
          secure: configService.getOrThrow<number>("EMAIL_PORT") === SMTP_SECURE_PORT,
          auth: {
            user: configService.getOrThrow<string>("EMAIL_USER"),
            pass: configService.getOrThrow<string>("EMAIL_PASSWORD"),
          },
        });

        transporter.use(
          "compile",
          hbs({
            viewEngine: {
              extname: ".hbs",
              layoutsDir: join(__dirname, "..", "common", "templates"),
              partialsDir: join(__dirname, "..", "common", "templates"),
              defaultLayout: false,
            },
            viewPath: join(__dirname, "..", "common", "templates"),
            extName: ".hbs",
          }),
        );

        return transporter;
      },
    },
    {
      provide: CustomMailerService,
      useClass: CustomMailerService,
    },
  ],
  exports: [CustomMailerService],
})
export class CustomMailerModule {}
