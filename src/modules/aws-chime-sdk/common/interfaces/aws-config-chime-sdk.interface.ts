import { IAwsBaseConfig } from "src/common/interfaces";

export interface IAwsConfigChimeSdk extends IAwsBaseConfig {
  awsAccountId: string;
  chimeControlRegion: string;
  sipMediaApplicationId: string;
  s3BucketName: string;
}
