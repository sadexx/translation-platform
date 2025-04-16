import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ObjectIdentifier,
  RestoreObjectCommand,
  S3Client,
  Tier,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  ENVIRONMENT,
  NUMBER_OF_SECONDS_IN_DAY,
  NUMBER_OF_SECONDS_IN_MINUTE,
  URL_EXPIRATION_DAYS,
  URL_EXPIRATION_MINUTES,
} from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { LokiLogger } from "src/common/logger";
import { IAwsConfigS3 } from "src/modules/aws-s3/common/interfaces";
import { Readable } from "stream";

@Injectable()
export class AwsS3Service {
  private readonly lokiLogger = new LokiLogger(AwsS3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly mediaBucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const { credentials, region, s3BucketName, s3MediaBucketName } = this.configService.getOrThrow<IAwsConfigS3>("aws");
    this.region = region;
    this.bucket = s3BucketName;
    this.mediaBucket = s3MediaBucketName;

    if (ENVIRONMENT === EEnvironment.PRODUCTION) {
      this.s3Client = new S3Client({
        region: this.region,
        requestHandler: new NodeHttpHandler({ socketTimeout: 25000, connectionTimeout: 5000 }),
        maxAttempts: 4,
      });
    } else {
      this.s3Client = new S3Client({
        credentials,
        region: this.region,
        requestHandler: new NodeHttpHandler({ socketTimeout: 25000, connectionTimeout: 5000 }),
        maxAttempts: 4,
      });
    }
  }

  public async getAudioKeyInFolder(folderPath: string): Promise<ListObjectsV2CommandOutput> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: folderPath,
      });
      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        throw new NotFoundException(`No files found in the specified folder path: ${folderPath}`);
      }

      return listResponse;
    } catch (error) {
      this.lokiLogger.error(`Error getting signed URL: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to get signed URL for the file");
    }
  }

  public async restoreObjectFromDeepArchive(key: string, days: number = 1): Promise<void> {
    try {
      const restoreCommand = new RestoreObjectCommand({
        Bucket: this.bucket,
        Key: key,
        RestoreRequest: {
          Days: days,
          GlacierJobParameters: {
            Tier: Tier.Bulk,
          },
        },
      });

      const response = await this.s3Client.send(restoreCommand);
      this.lokiLogger.log(`Restore request initiated for object ${key}. Response: ${JSON.stringify(response)}`);
    } catch (error) {
      this.lokiLogger.error(`Error restoring object ${key}: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to restore object from DEEP_ARCHIVE");
    }
  }

  public async getShortLivedSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: URL_EXPIRATION_MINUTES * NUMBER_OF_SECONDS_IN_MINUTE,
      });
    } catch (error) {
      this.lokiLogger.error(`Error getting signed URL:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to get signed URL for the file");
    }
  }

  public async getMaxLivedSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: URL_EXPIRATION_DAYS * NUMBER_OF_SECONDS_IN_DAY,
      });
    } catch (error) {
      this.lokiLogger.error(`Error getting signed URL:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to get signed URL for the file");
    }
  }

  public async uploadObject(
    key: string,
    body: ReadableStream | Readable,
    contentType: string,
    isMediaBucket: boolean = false,
  ): Promise<CompleteMultipartUploadCommandOutput> {
    try {
      const bucketName = this.getBucketName(isMediaBucket);
      const commandToUploadFile = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        },
      });

      return await commandToUploadFile.done();
    } catch (error) {
      this.lokiLogger.error(`Error uploading object:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to upload object");
    }
  }

  public async getMediaListObjectKeys(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.mediaBucket,
        Prefix: prefix,
      });

      const data = await this.s3Client.send(command);

      return data.Contents?.map((item) => item.Key!) ?? [];
    } catch (error) {
      this.lokiLogger.error(`Error getting list of objects:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to get list of objects");
    }
  }

  public async deleteObject(key: string, isMediaBucket: boolean = false): Promise<DeleteObjectCommandOutput> {
    try {
      const bucketName = this.getBucketName(isMediaBucket);
      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await this.s3Client.send(deleteObjectCommand);
    } catch (error) {
      this.lokiLogger.error(`Error deleting object:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to delete object");
    }
  }

  public async deleteMediaObjects(objects: ObjectIdentifier[]): Promise<void> {
    try {
      const deleteObjectsCommand = new DeleteObjectsCommand({
        Bucket: this.mediaBucket,
        Delete: {
          Objects: objects,
        },
      });

      await this.s3Client.send(deleteObjectsCommand);
    } catch (error) {
      this.lokiLogger.error(`Error deleting objects:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to delete objects");
    }
  }

  private getBucketName(isMediaBucket: boolean): string {
    return isMediaBucket ? this.mediaBucket : this.bucket;
  }

  public getMediaObjectUrl(key: string): string {
    return `https://${this.mediaBucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  public getKeyFromUrl(url: string): string {
    const parsedUrl = new URL(url);

    return parsedUrl.pathname.slice(1);
  }
}
