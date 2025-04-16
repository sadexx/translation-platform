import { Injectable } from "@nestjs/common";
import { Appointment } from "src/modules/appointments/entities";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { QueueManagementService } from "src/modules/queues/services";
import { IQueueDataBulk } from "src/modules/queues/common/interfaces";
import { EJobType, EQueueType } from "src/modules/queues/common/enums";
import { EMembershipNotificationType, EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import Stripe from "stripe";
import { Message } from "@aws-sdk/client-sqs";

@Injectable()
export class QueueInitializeService {
  constructor(private readonly queueManagementService: QueueManagementService) {}

  public async addProcessExistingAppointmentsForDiscountsQueue(
    appointments: Appointment[],
    membershipAssignment: MembershipAssignment,
  ): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.APPOINTMENTS_QUEUE,
      jobItems: appointments.map((appointment) => ({
        jobName: EJobType.PROCESS_APPOINTMENT_DISCOUNTS,
        payload: { appointment, membershipAssignment },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addNotifyUsersAboutMembershipChangesQueue(
    membership: Membership,
    notificationType: EMembershipNotificationType,
    membershipPricingRegion?: EMembershipPricingRegion,
  ): Promise<void> {
    if (!membership.currentMemberships) {
      return;
    }

    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.NOTIFICATIONS_QUEUE,
      jobItems: membership.currentMemberships.map((membershipAssignment) => ({
        jobName: EJobType.PROCESS_NOTIFY_MEMBERSHIP_CHANGES,
        payload: {
          membership,
          membershipAssignment,
          notificationType,
          membershipPricingRegion,
        },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addStripeCancelSubscriptionsQueue(subscriptions: Stripe.Subscription[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.PAYMENTS_QUEUE,
      jobItems: subscriptions.map((subscription) => ({
        jobName: EJobType.PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS,
        payload: { subscriptionId: subscription.id },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addSubscriptionsUpdatePriceQueue(customerIds: string[], newPriceId: string): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.PAYMENTS_QUEUE,
      jobItems: customerIds.map((customerId) => ({
        jobName: EJobType.PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE,
        payload: { customerId, newPriceId },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addProcessSumSubWebhookQueue(sqsMessages: Message[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.WEBHOOKS_QUEUE,
      jobItems: sqsMessages.map((message) => ({
        jobName: EJobType.PROCESS_SUMSUB_WEBHOOK,
        payload: { message },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addProcessDocusignWebhookQueue(sqsMessages: Message[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.WEBHOOKS_QUEUE,
      jobItems: sqsMessages.map((message) => ({
        jobName: EJobType.PROCESS_DOCUSIGN_WEBHOOK,
        payload: { message },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }

  public async addProcessStripeWebhookQueue(sqsMessages: Message[]): Promise<void> {
    const jobData: IQueueDataBulk = {
      queueEnum: EQueueType.WEBHOOKS_QUEUE,
      jobItems: sqsMessages.map((message) => ({
        jobName: EJobType.PROCESS_STRIPE_WEBHOOK,
        payload: { message },
      })),
    };
    await this.queueManagementService.addBulk(jobData);
  }
}
