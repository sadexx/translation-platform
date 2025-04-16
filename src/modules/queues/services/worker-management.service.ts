import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker, Job, ConnectionOptions, MetricsTime } from "bullmq";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { QueueProcessorBridgeService } from "src/modules/queue-processor-bridge/services";
import { BULLMQ_CONNECTION } from "src/modules/queues/common/constants";
import { EQueueType, EWorkerType } from "src/modules/queues/common/enums";
import { IQueueJobType, IWorkerSettings } from "src/modules/queues/common/interfaces";

@Injectable()
export class WorkerManagementService implements OnModuleInit, OnModuleDestroy {
  private workersMap = new Map<EQueueType, Worker>();
  private readonly lokiLogger = new LokiLogger(WorkerManagementService.name);

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: ConnectionOptions,
    private readonly queueProcessorBridgeService: QueueProcessorBridgeService,
  ) {}

  public async onModuleInit(): Promise<void> {
    for (const queueEnum of Object.values(EQueueType)) {
      const { queueName, workerOptions } = await this.getWorkerSettings(queueEnum);
      this.lokiLogger.debug(`Initializing Worker for queue [${queueEnum}] with name "${queueName}"`);

      const worker = new Worker(
        queueName,
        async (job: Job<IQueueJobType>) => {
          return await this.queueProcessorBridgeService.processJob(queueEnum, job);
        },
        {
          connection: this.connection,
          ...workerOptions,
        },
      );

      worker.on("failed", (job, err) => {
        this.lokiLogger.error(`Job #${job?.id} on [${queueEnum}] failed: ${err.message}`);
      });

      this.lokiLogger.debug(`Worker initialized for queue [${queueEnum}]`);
      this.workersMap.set(queueEnum, worker);
    }
  }

  public async onModuleDestroy(): Promise<void> {
    for (const [queueEnum, worker] of this.workersMap.entries()) {
      this.lokiLogger.debug(`Closing worker for queue [${queueEnum}]`);
      await worker.close();
    }
  }

  private async getWorkerSettings(queueEnum: EQueueType): Promise<IWorkerSettings> {
    switch (queueEnum) {
      case EQueueType.PAYMENTS_QUEUE:
        return {
          queueName: EQueueType.PAYMENTS_QUEUE,
          workerOptions: {
            name: EWorkerType.PAYMENTS,
            concurrency: 1,
            lockDuration: 40000,
            stalledInterval: 30000,
            drainDelay: 5000,
            metrics: {
              maxDataPoints: MetricsTime.TWO_WEEKS,
            },
            limiter: {
              max: 1,
              duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
            },
          },
        };

      case EQueueType.APPOINTMENTS_QUEUE:
        return {
          queueName: EQueueType.APPOINTMENTS_QUEUE,
          workerOptions: {
            name: EWorkerType.APPOINTMENTS,
            concurrency: 1,
            lockDuration: 40000,
            stalledInterval: 30000,
            drainDelay: 5000,
            metrics: {
              maxDataPoints: MetricsTime.TWO_WEEKS,
            },
            limiter: {
              max: 1,
              duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
            },
          },
        };

      case EQueueType.NOTIFICATIONS_QUEUE:
        return {
          queueName: EQueueType.NOTIFICATIONS_QUEUE,
          workerOptions: {
            name: EWorkerType.NOTIFICATIONS,
            concurrency: 3,
            lockDuration: 40000,
            stalledInterval: 30000,
            drainDelay: 5000,
            metrics: {
              maxDataPoints: MetricsTime.TWO_WEEKS,
            },
            limiter: {
              max: 3,
              duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
            },
          },
        };

      case EQueueType.WEBHOOKS_QUEUE:
        return {
          queueName: EQueueType.WEBHOOKS_QUEUE,
          workerOptions: {
            name: EWorkerType.WEBHOOKS,
            concurrency: 1,
            lockDuration: 40000,
            stalledInterval: 30000,
            drainDelay: 5000,
            metrics: {
              maxDataPoints: MetricsTime.TWO_WEEKS,
            },
            limiter: {
              max: 1,
              duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
            },
          },
        };

      default:
        return {
          queueName: EQueueType.DEFAULT,
          workerOptions: {
            name: EWorkerType.DEFAULT,
            concurrency: 1,
            lockDuration: 30000,
            stalledInterval: 30000,
            drainDelay: 5000,
            metrics: {
              maxDataPoints: MetricsTime.TWO_WEEKS,
            },
            limiter: {
              max: 1,
              duration: NUMBER_OF_MILLISECONDS_IN_SECOND,
            },
          },
        };
    }
  }
}
