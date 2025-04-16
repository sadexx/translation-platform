import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { BulkJobOptions, ConnectionOptions, DefaultJobOptions, JobsOptions, Queue } from "bullmq";
import { IQueueData, IQueueDataBulk, IQueueSettings } from "src/modules/queues/common/interfaces";
import { EQueueType } from "src/modules/queues/common/enums";
import { BULLMQ_CONNECTION } from "src/modules/queues/common/constants";
import { NUMBER_OF_MILLISECONDS_IN_SECOND, NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS } from "src/common/constants";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class QueueManagementService implements OnModuleInit, OnModuleDestroy {
  private queueMap = new Map<EQueueType, { queue: Queue }>();
  private readonly lokiLogger = new LokiLogger(QueueManagementService.name);

  constructor(@Inject(BULLMQ_CONNECTION) private readonly connection: ConnectionOptions) {}

  public async onModuleInit(): Promise<void> {
    for (const queueEnum of Object.values(EQueueType)) {
      const { queueName, queueOptions } = await this.getQueueSettings(queueEnum);

      this.lokiLogger.debug(`Initializing Queue & Scheduler for enum "${queueEnum}" with name "${queueName}"`);

      const queue = new Queue(queueName, {
        connection: this.connection,
        ...queueOptions,
      });

      this.queueMap.set(queueEnum, { queue });
      this.lokiLogger.debug(`Queue & Scheduler created for "${queueName}"`);
    }
  }

  private async getQueueSettings(queueEnum: EQueueType): Promise<IQueueSettings> {
    const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
      delay: NUMBER_OF_MILLISECONDS_IN_SECOND,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
      },
      removeOnComplete: true,
      removeOnFail: true,
    };

    switch (queueEnum) {
      case EQueueType.PAYMENTS_QUEUE:
        return {
          queueName: EQueueType.PAYMENTS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      case EQueueType.APPOINTMENTS_QUEUE:
        return {
          queueName: EQueueType.APPOINTMENTS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      case EQueueType.NOTIFICATIONS_QUEUE:
        return {
          queueName: EQueueType.NOTIFICATIONS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      case EQueueType.WEBHOOKS_QUEUE:
        return {
          queueName: EQueueType.WEBHOOKS_QUEUE,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };

      default:
        return {
          queueName: EQueueType.DEFAULT,
          queueOptions: {
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
          },
        };
    }
  }

  public async onModuleDestroy(): Promise<void> {
    for (const [queueEnum, { queue }] of this.queueMap.entries()) {
      this.lokiLogger.debug(`Closing queue and scheduler for [${queueEnum}]`);
      await queue.close();
    }
  }

  private queueNotFound(queueEnum: EQueueType): void {
    this.lokiLogger.error(`Queue not found: ${queueEnum}`);
  }

  public async addJob(jobData: IQueueData, opts?: JobsOptions): Promise<void> {
    const { queueEnum, jobItem } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    await queueObject.queue.add(jobItem.jobName, jobItem.payload, opts);
  }

  public async addJobWithCustomDelay(jobData: IQueueData, delay: number): Promise<void> {
    const { queueEnum, jobItem } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    await queueObject.queue.add(jobItem.jobName, jobItem.payload, { delay: delay });
  }

  public async addBulk(jobData: IQueueDataBulk, opts?: BulkJobOptions): Promise<void> {
    const { queueEnum, jobItems } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    const jobs = jobItems.map((jobData) => ({
      name: jobData.jobName,
      data: { jobName: jobData.jobName, payload: jobData.payload },
      opts: opts,
    }));

    await queueObject.queue.addBulk(jobs);
  }

  public async addBulkWithCustomDelay(jobData: IQueueDataBulk, delay: number): Promise<void> {
    const { queueEnum, jobItems } = jobData;
    const queueObject = this.queueMap.get(queueEnum);

    if (!queueObject) {
      this.queueNotFound(queueEnum);

      return;
    }

    const jobs = jobItems.map((jobData, index) => ({
      name: jobData.jobName,
      data: { jobName: jobData.jobName, payload: jobData.payload },
      opts: { delay: index * delay },
    }));

    await queueObject.queue.addBulk(jobs);
  }
}
