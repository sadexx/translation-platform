import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { IFile } from "src/modules/file-management/common/interfaces";
import { UUIDParamDto } from "src/common/dto";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { UserAvatarsManualDecisionDto } from "src/modules/user-avatars/common/dto";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { MessageOutput } from "src/common/outputs";

@Controller("user-avatars")
export class UserAvatarsController {
  constructor(private readonly userAvatarsService: UserAvatarsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get(":id")
  async getAvatarRequestByUserId(@Param() { id }: UUIDParamDto): Promise<UserAvatarRequest> {
    return await this.userAvatarsService.getAvatarRequestByUserId(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload")
  async uploadAvatar(@UploadedFile() file: IFile, @CurrentUser() user: ITokenUserData): Promise<MessageOutput> {
    return await this.userAvatarsService.uploadAvatar(user, file);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("manual-decision")
  async rightToWorkCheckManualDecision(@Body() dto: UserAvatarsManualDecisionDto): Promise<void> {
    return await this.userAvatarsService.userAvatarManualDecision(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Delete("remove")
  async removeAvatar(@CurrentUser() user: ITokenUserData): Promise<MessageOutput> {
    return await this.userAvatarsService.removeAvatar(user);
  }
}
