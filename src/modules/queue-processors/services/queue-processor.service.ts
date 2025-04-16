import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { EJobType, EQueueType } from "src/modules/queues/common/enums";
import { DiscountsService } from "src/modules/discounts/services";
import { MembershipsService } from "src/modules/memberships/services";
import { StripeService } from "src/modules/stripe/services";
import { IQueueJobType } from "src/modules/queues/common/interfaces";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { LokiLogger } from "src/common/logger";
import { IQueueProcessor } from "src/modules/queue-processors/common/interfaces";
import {
  WebhookDocusignService,
  WebhookStripeService,
  WebhookSumSubService,
} from "src/modules/webhook-processor/services";

@Injectable()
export class QueueProcessorService implements IQueueProcessor {
  private readonly lokiLogger = new LokiLogger(QueueProcessorService.name);
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly stripeService: StripeService,
    private readonly discountsService: DiscountsService,
    private readonly webhookStripeService: WebhookStripeService,
    private readonly webhookDocusignService: WebhookDocusignService,
    private readonly webhookSumSubService: WebhookSumSubService,
  ) {}

  public async processJob(queueEnum: EQueueType, job: Job<IQueueJobType>): Promise<void> {
    switch (queueEnum) {
      case EQueueType.PAYMENTS_QUEUE:
        return this.handlePaymentsJob(job);
      case EQueueType.APPOINTMENTS_QUEUE:
        return this.handleAppointmentsJob(job);
      case EQueueType.NOTIFICATIONS_QUEUE:
        return this.handleNotificationsJob(job);
      case EQueueType.WEBHOOKS_QUEUE:
        return this.handleWebhooksJob(job);

      default:
        return this.handleDefaultJob(job);
    }
  }

  private async handlePaymentsJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS: {
        const { subscriptionId } = job.data.payload;

        return this.stripeService.cancelSubscriptionById(subscriptionId);
      }
      case EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE: {
        const { customerId, newPriceId } = job.data.payload;

        return this.stripeService.updateSubscriptionPrice(customerId, newPriceId);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleAppointmentsJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_APPOINTMENT_DISCOUNTS: {
        const { appointment, membershipAssignment } = job.data.payload;
        const discountEntity = Object.assign(new MembershipAssignment(), membershipAssignment);

        return await this.discountsService.createOrUpdateDiscountAssociation(appointment, discountEntity);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleNotificationsJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_NOTIFY_MEMBERSHIP_CHANGES: {
        const { membership, membershipAssignment, notificationType, membershipPricingRegion } = job.data.payload;

        return await this.membershipsService.processNotifyMembershipChanges(
          membership,
          membershipAssignment,
          notificationType,
          membershipPricingRegion,
        );
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleWebhooksJob(job: Job<IQueueJobType>): Promise<void> {
    switch (job.data.jobName) {
      case EJobType.PROCESS_SUMSUB_WEBHOOK: {
        const { message } = job.data.payload;

        return this.webhookSumSubService.processSumSubWebhook(message);
      }
      case EJobType.PROCESS_DOCUSIGN_WEBHOOK: {
        const { message } = job.data.payload;

        return this.webhookDocusignService.processDocusignWebhook(message);
      }
      case EJobType.PROCESS_STRIPE_WEBHOOK: {
        const { message } = job.data.payload;

        return this.webhookStripeService.processStripeWebhook(message);
      }
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleDefaultJob(job: Job): Promise<void> {
    switch (job.name) {
      default:
        return this.handleUnknownJob(job);
    }
  }

  private async handleUnknownJob(job: Job): Promise<void> {
    this.lokiLogger.error(`Received unknown job: #${job.id}, name:[${job.name}], data: ${JSON.stringify(job.data)}`);
  }
}
