import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { BackyCheckService } from "src/modules/backy-check/services";
import { StartWWCCDto, StatusManualDecisionDto, UpdateWWCCDto } from "src/modules/backy-check/common/dto";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { IFile } from "src/modules/file-management/common/interfaces";
import { IDownloadDocsInterface, IStartWwccRes, IUploadDocsInterface } from "src/modules/backy-check/common/interfaces";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { GetWwccOutput } from "src/modules/backy-check/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("backy-check")
export class BackyCheckController {
  constructor(private readonly backyCheckService: BackyCheckService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload-docs")
  async uploadDocs(
    @Query() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
    @UploadedFile() file: IFile,
  ): Promise<IUploadDocsInterface> {
    return this.backyCheckService.uploadDocs(id, user, file);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("download-docs")
  async downloadDocs(
    @Query() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IDownloadDocsInterface> {
    return this.backyCheckService.downloadDocs(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("start-wwcc")
  async startWWCC(@Body() dto: StartWWCCDto, @CurrentUser() user: ITokenUserData): Promise<IStartWwccRes> {
    return this.backyCheckService.startWWCC(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Patch()
  async updateWWCC(
    @Query() dto: UpdateWWCCDto,
    @CurrentUser() user: ITokenUserData,
    @UploadedFile() file: IFile,
  ): Promise<MessageOutput> {
    return this.backyCheckService.updateWWCC(dto, user, file);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("get-wwcc-request")
  async getWWCCRequestByUser(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<GetWwccOutput | null> {
    return this.backyCheckService.getWWCCRequest(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("status-manual-decision")
  async statusManualDecision(@Body() dto: StatusManualDecisionDto): Promise<void> {
    return this.backyCheckService.statusManualDecision(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async removeWWCCRequest(@Query() { id }: UUIDParamDto): Promise<void> {
    return this.backyCheckService.removeWWCCRequest(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-file")
  async removeWWCCFile(@Query() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.backyCheckService.removeWWCCFile(id, user);
  }
}
