import { CustomMailerService } from "src/modules/emails/custom-mailer";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { generateCode } from "src/common/utils";
import { RedisService } from "src/modules/redis/services";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { IPayInReceipt, IPayOutReceipt, ITaxInvoiceReceipt } from "src/modules/pdf/common/interfaces";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { format } from "date-fns";
import { ECurrencies } from "src/modules/payments/common/enums";

@Injectable()
export class EmailsService {
  constructor(
    private readonly mailService: CustomMailerService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  public async sendConfirmationCode(email: string): Promise<string> {
    const emailConfirmationCode = generateCode();
    await this.mailService.sendMail({
      to: email,
      subject: `Your Verification Code`,
      template: "confirmation-code",
      context: {
        code: emailConfirmationCode,
        action: "registration",
        codeDuration: this.configService.getOrThrow<number>("redis.ttlMinutes"),
        user: email,
      },
    });

    await this.redisService.set(email, emailConfirmationCode);

    return `Code send to the ${email}`;
  }

  public async sendPasswordResetLink(
    email: string,
    passwordResetLink: string,
    messageDuration: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Password change`,
      template: "reset-password",
      context: {
        link: passwordResetLink,
        message: "Process by the link below to change your password.",
        duration: messageDuration,
        user: email,
      },
    });

    return `Code send to the ${email}`;
  }

  public async sendCompanySuperAdminInvitationLink(
    email: string,
    completeRegistrationLink: string,
    messageDuration: string,
    adminName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Complete LFH Company Registration Process`,
      template: "company-registration-link",
      context: {
        adminName,
        link: completeRegistrationLink,
        message: "Process by the link below to change your password.",
        duration: messageDuration,
        user: email,
      },
    });

    return `Code send to the ${email}`;
  }

  public async sendCompanyRestorationLink(
    email: string,
    restorationLink: string,
    messageDuration: string,
    adminName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `LFH Company Account Deletion Notification`,
      template: "company-restoration-link",
      context: {
        adminName,
        link: restorationLink,
        message: "To restore the company - follow the link.",
        duration: messageDuration,
        user: email,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendUserSelfRestorationLink(
    email: string,
    restorationLink: string,
    messageDuration: string,
    nameOfPersonToSendRestorationLink: string,
    roleName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `LFH Company Account Deletion Notification`,
      template: "user-self-restoration-link",
      context: {
        userName: nameOfPersonToSendRestorationLink,
        roleName,
        link: restorationLink,
        message: "To restore the account role - follow the link.",
        duration: messageDuration,
        user: email,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendUserRestorationLink(
    email: string,
    restorationLink: string,
    messageDuration: string,
    nameOfPersonToSendRestorationLink: string,
    nameOfPersonWhoDeleting: string,
    platformIdOfPersonWhichAccountDeleting: string,
    roleName: string,
    companyName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `LFH Company Account Deletion Notification`,
      template: "user-restoration-link",
      context: {
        adminName: nameOfPersonToSendRestorationLink,
        roleName,
        platformId: platformIdOfPersonWhichAccountDeleting,
        companyName,
        userName: nameOfPersonWhoDeleting,
        link: restorationLink,
        message: "To restore the account role - follow the link.",
        duration: messageDuration,
        user: email,
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendCompanyEmployeeInvitationLink(
    email: string,
    completeRegistrationLink: string,
    messageDuration: string,
    adminName: string,
    roleName: EUserRoleName,
    companyName: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Complete LFH Company Employee Registration Process`,
      template: "company-employee-registration-link",
      context: {
        adminName,
        link: completeRegistrationLink,
        message: "Process by the link below to register as company employee.",
        duration: messageDuration,
        user: email,
        role: roleName,
        companyName,
      },
    });

    return `Link sent to the ${email}`;
  }

  public async sendSuperAdminActivationLink(email: string, activationLink: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: "LFH - Account Activation",
      template: "super-admin-activation",
      context: {
        activationLink,
      },
    });

    return `Activation link sent to the ${email}`;
  }

  public async sendBeckyCheckNotifyToAdmin(email: string, userId: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify WWCC number`,
      template: "backy-check-admin-notify",
      context: {
        interpreterId: userId,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendConcessionCardNotifyToAdmin(email: string, userId: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify concession card`,
      template: "concession-card-admin-notify",
      context: {
        interpreterId: userId,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendLanguageDocNotifyToAdmin(email: string, userId: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify Language Doc`,
      template: "language-doc-admin-notify",
      context: {
        interpreterId: userId,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendRightToWorkCheckNotifyToAdmin(email: string, userId: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify Right To Work check`,
      template: "right-to-work-check-admin-notify",
      context: {
        interpreterId: userId,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAbnNotifyToAdmin(
    email: string,
    firstName: string,
    lastName: string,
    platformId: string,
    abnTypeCode: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Verify ABN number`,
      template: "abn-admin-notify",
      context: {
        firstName,
        lastName,
        platformId,
        abnTypeCode,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendNaatiWebScraperNotifyToAdmin(email: string, massage: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Status job of Naati Web Scraper`,
      template: "naati-web-scraper-admin-notify",
      context: {
        massage,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendAudioRecordUrlNotifyToAdmin(
    email: string,
    platformId: string,
    appointmentUrlLink: string,
    audioUrlLink: string,
    dateAccess: string,
    dateExpiration: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Audio record url for platform id: ${platformId}`,
      template: "audio-record-url-admin-notify",
      context: {
        appointmentUrlLink,
        audioUrlLink,
        dateExpiration,
        dateAccess,
      },
    });

    return `Notify send to the ${email}`;
  }

  public async sendUserRegistrationLink(
    email: string,
    registrationLink: string,
    messageDuration: string,
    roleName: EUserRoleName,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Invitation to Join LFH System`,
      template: "user-registration-link",
      context: {
        link: registrationLink,
        message: "Click the link below to complete your registration.",
        duration: messageDuration,
        user: email,
        role: roleName,
      },
    });

    return `Registration link sent to ${email}`;
  }

  public async sendDraftConfirmationLink(email: string, draftAppointmentLink: string): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `New Appointment Confirmation`,
      template: "new-appointment-confirmation",
      context: {
        link: draftAppointmentLink,
        message: "The new Appointment has been created by the Booking Officer. Please confirm the appointment.",
      },
    });

    return `Link send to the ${email}`;
  }

  public async sendIncomingPaymentReceipt(email: string, receiptLink: string, data: IPayInReceipt): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Payment Invoice Paid`,
      template: "incoming-payment-receipt",
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Incoming payment receipt sent to ${email}`;
  }

  public async sendOutgoingPaymentReceipt(email: string, receiptLink: string, data: IPayOutReceipt): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Remittance Advice`,
      template: "outgoing-payment-receipt",
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Outgoing payment receipt sent to ${email}`;
  }

  public async sendTaxInvoicePaymentReceipt(
    email: string,
    receiptLink: string,
    data: ITaxInvoiceReceipt,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Tax Invoice`,
      template: "tax-invoice-receipt",
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Tax invoice receipt sent to ${email}`;
  }

  public async sendMembershipPriceUpdateEmail(
    email: string,
    userName: string,
    newPrice: number,
    membershipType: EMembershipType,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Membership Price Was Updated`,
      template: "membership-price-update",
      context: {
        userName,
        newPrice,
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
      },
    });

    return `Price update email sent to ${email}`;
  }

  public async sendMembershipDeactivationEmail(
    email: string,
    userName: string,
    endDate: Date,
    membershipType: EMembershipType,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Your Membership Program Was Deactivated`,
      template: "membership-deactivation",
      context: {
        userName,
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
        endDate: format(endDate, "MMMM dd, yyyy"),
        dateAffected: format(new Date(), "MMMM dd, yyyy"),
      },
    });

    return `Deactivation email sent to ${email}`;
  }

  public async sendMembershipPaymentSucceededEmail(
    email: string,
    userName: string,
    membershipType: EMembershipType,
    receiptLink: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Membership Payment Succeeded`,
      template: "membership-payment-succeeded",
      context: {
        userName,
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
        receiptLink,
      },
    });

    return `Membership payment failed email sent to ${email}`;
  }

  public async sendMembershipPaymentFailedEmail(
    email: string,
    userName: string,
    membershipType: EMembershipType,
    amount: number,
    currency: ECurrencies,
    invoiceNumber: string,
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Membership Payment Failed`,
      template: "membership-payment-failed",
      context: {
        userName,
        membershipType: membershipType.charAt(0).toUpperCase() + membershipType.slice(1),
        amount,
        currency,
        invoiceNumber,
      },
    });

    return `Membership payment failed email sent to ${email}`;
  }

  public async sendDepositChargeReceipt(
    email: string,
    receiptLink: string,
    data: { platformId: string },
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Deposit Charge Successful`,
      template: "deposit-charge-successful",
      context: {
        ...data,
        receiptLink,
      },
    });

    return `Deposit Charge receipt sent to ${email}`;
  }

  public async sendDepositLowBalanceNotification(email: string, data: { platformId: string }): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Deposit Balance Is Low`,
      template: "deposit-balance-is-low",
      context: {
        ...data,
      },
    });

    return `Deposit Balance Is Low notification sent to ${email}`;
  }

  public async sendDepositChargeFailedNotification(email: string, data: { platformId: string }): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Deposit Charge Failed`,
      template: "deposit-charge-failed",
      context: {
        ...data,
      },
    });

    return `Deposit Charge Failed notification sent to ${email}`;
  }

  public async sendDepositBalanceInsufficientFundNotification(
    email: string,
    data: { platformId: string },
  ): Promise<string> {
    await this.mailService.sendMail({
      to: email,
      subject: `Service Termination, Low Balance`,
      template: "deposit-balance-insufficient-fund",
      context: {
        ...data,
      },
    });

    return `Service Termination Low Balance notification sent to ${email}`;
  }
}
