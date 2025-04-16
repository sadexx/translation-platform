import { Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { FileManagementService } from "src/modules/file-management/services";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { IFile } from "src/modules/file-management/common/interfaces";
import { TermsDownloadParamDto, TermsUploadParamDto } from "src/modules/file-management/common/dto";
import { UploadTermsOutput } from "src/modules/file-management/common/outputs";

@Controller("file-management")
export class FileManagementController {
  constructor(private readonly fileManagementService: FileManagementService) {}

  @Post("upload-terms")
  @UseInterceptors(CustomFileInterceptor)
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async uploadTerms(
    @Query() termsUploadParamDto: TermsUploadParamDto,
    @UploadedFile() file: IFile,
  ): Promise<UploadTermsOutput> {
    await this.fileManagementService.uploadTerms(termsUploadParamDto.role, file);

    return {
      message: `${termsUploadParamDto.documentType} for ${termsUploadParamDto.role} has been successfully uploaded!`,
    };
  }

  @Get("download-terms")
  async downloadTerms(@Query() termsDownloadParamDto: TermsDownloadParamDto): Promise<string[]> {
    return this.fileManagementService.downloadTerms(termsDownloadParamDto.role);
  }
}
