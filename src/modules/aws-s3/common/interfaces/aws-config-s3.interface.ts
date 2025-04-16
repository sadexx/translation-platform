import { IAwsBaseConfig } from "src/common/interfaces";

export interface IAwsConfigS3 extends IAwsBaseConfig {
  s3BucketName: string;
  s3MediaBucketName: string;
}
