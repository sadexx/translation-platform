import { IAwsBaseConfig } from "src/common/interfaces";

export interface IAwsConfigMessagingSdk extends IAwsBaseConfig {
  chimeMessagingControlRegion: string;
}
