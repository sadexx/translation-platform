import { ListObjectsV2CommandOutput, ObjectStorageClass } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { addDays, format } from "date-fns";
import { NUMBER_OF_DAYS_IN_TWO_DAYS, NUMBER_OF_DAYS_IN_WEEK } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { MessageOutput } from "src/common/outputs";
import { findOneOrFail } from "src/common/utils";
import { EAppointmentStatus } from "src/modules/appointments/common/enums";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/entities";
import { AwsS3Service } from "src/modules/aws-s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";
import { HelperService } from "src/modules/helper/services";
import { FindOneOptions, Repository } from "typeorm";

@Injectable()
export class ArchiveAudioRecordService {
  private readonly lokiLogger = new LokiLogger(ArchiveAudioRecordService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly awsS3Service: AwsS3Service,
    private readonly helperService: HelperService,
    private readonly emailsService: EmailsService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getAudioRecordingForAppointment(id: string): Promise<MessageOutput | string> {
    const queryOptions: FindOneOptions<AppointmentAdminInfo> = {
      select: {
        id: true,
        callRecordingS3Key: true,
        deepArchiveRestoreExpirationDate: true,
        appointment: {
          id: true,
          platformId: true,
        },
      },
      where: { id: id, appointment: { status: EAppointmentStatus.COMPLETED } },
      relations: { appointment: true },
    };
    const appointmentAdminInfo = await findOneOrFail(id, this.appointmentAdminInfoRepository, queryOptions);

    if (!appointmentAdminInfo.callRecordingS3Key) {
      throw new NotFoundException(`Recording key is not found in appointment admin info with id: ${id}`);
    }

    if (
      appointmentAdminInfo.deepArchiveRestoreExpirationDate &&
      appointmentAdminInfo.deepArchiveRestoreExpirationDate > new Date()
    ) {
      throw new BadRequestException(
        `The requested file has been accepted for restore.` +
          ` It will be available soon. Please try after:` +
          ` ${appointmentAdminInfo.deepArchiveRestoreExpirationDate.toISOString()}.`,
      );
    }

    const listResponse = await this.awsS3Service.getAudioKeyInFolder(appointmentAdminInfo.callRecordingS3Key);
    const response = await this.determineStorageClassForAudioRecording(
      appointmentAdminInfo,
      listResponse,
      appointmentAdminInfo.callRecordingS3Key,
    );

    return response;
  }

  private async determineStorageClassForAudioRecording(
    appointmentAdminInfo: AppointmentAdminInfo,
    listResponse: ListObjectsV2CommandOutput,
    folderPath: string,
  ): Promise<MessageOutput | string> {
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      throw new NotFoundException(`File key is undefined for: ${folderPath}`);
    }

    const [file] = listResponse.Contents;

    if (!file.Key || listResponse.Contents.length > 1) {
      throw new NotFoundException(
        `Issue with the number of files found for this appointment admin info: ${appointmentAdminInfo.id}`,
      );
    }

    if (file.StorageClass === ObjectStorageClass.DEEP_ARCHIVE) {
      this.scheduleRestoreAndNotifyAdmin(file.Key, folderPath, appointmentAdminInfo).catch((err: Error) => {
        this.lokiLogger.error(`Error restoring audio recording: ${err.message}. Folder path: ${folderPath}`, err.stack);
      });

      return {
        message:
          "Requested file has been moved to a deep archive." +
          " Please wait for an e-mail while the file is restored. " +
          " Typically, this process takes within 48 hours.",
      };
    }

    return await this.awsS3Service.getShortLivedSignedUrl(file.Key);
  }

  private async scheduleRestoreAndNotifyAdmin(
    fileKey: string,
    folderPath: string,
    appointmentAdminInfo: AppointmentAdminInfo,
  ): Promise<void> {
    const dateToday = new Date();
    const dateAccess = addDays(dateToday, NUMBER_OF_DAYS_IN_TWO_DAYS);
    const dateExpiration = addDays(dateToday, NUMBER_OF_DAYS_IN_WEEK);
    await this.restoreAudioRecordingFromDeepArchive(fileKey);
    const signedUrl = await this.awsS3Service.getMaxLivedSignedUrl(fileKey);

    await this.appointmentAdminInfoRepository.update(appointmentAdminInfo.id, {
      deepArchiveRestoreExpirationDate: dateExpiration,
    });

    await this.sendEmailsToAdminsInBackground(
      appointmentAdminInfo.appointment,
      signedUrl,
      dateAccess,
      dateExpiration,
    ).catch((err: Error) => {
      this.lokiLogger.error(`Error sending emails to admins: ${err.message}. Folder path: ${folderPath}`, err.stack);
    });
  }

  private async restoreAudioRecordingFromDeepArchive(fileKey: string): Promise<void> {
    const STANDARD_ACCESS_DAYS: number = 7;
    await this.awsS3Service.restoreObjectFromDeepArchive(fileKey, STANDARD_ACCESS_DAYS);
  }

  private async sendEmailsToAdminsInBackground(
    appointment: Appointment,
    signedUrl: string,
    dateAccess: Date,
    dateExpiration: Date,
  ): Promise<void> {
    const formattedDateAccess = await this.formatDate(dateAccess);
    const formattedDateExpiration = await this.formatDate(dateExpiration);
    const appointmentUrlLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentId":"${appointment.id}"}`;
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendAudioRecordUrlNotifyToAdmin(
        superAdmin.email,
        appointment.platformId,
        appointmentUrlLink,
        signedUrl,
        formattedDateAccess,
        formattedDateExpiration,
      );
    }
  }

  private async formatDate(date: Date): Promise<string> {
    return format(date, "EEEE, MMMM do, yyyy 'at' h:mm a");
  }
}
