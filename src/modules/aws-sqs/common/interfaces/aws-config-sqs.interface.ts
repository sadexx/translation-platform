import { IAwsBaseConfig } from "src/common/interfaces";

export interface IAwsConfigSqs extends IAwsBaseConfig {
  sqsQueueUrl: string;
  intervalTimeMinutes: number;
}
