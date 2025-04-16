import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Transporter } from "nodemailer";
import SMTPPool from "nodemailer/lib/smtp-pool";

@Injectable()
export class CustomMailerService {
  private readonly FROM: string;

  constructor(
    @Inject("MAILER_TRANSPORT") private readonly transporter: Transporter<SMTPPool.SentMessageInfo>,
    private readonly configService: ConfigService,
  ) {
    this.FROM = `"${this.configService.getOrThrow<string>(
      "EMAIL_AUTHOR_NAME",
    )}" <${this.configService.getOrThrow<string>("EMAIL_AUTHOR")}>`;
  }

  public async sendMail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, string | number | boolean | null>;
  }): Promise<void> {
    await this.transporter.sendMail({
      ...options,
      from: this.FROM,
    });
  }
}
