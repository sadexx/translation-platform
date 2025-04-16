import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { UserProfilesService } from "src/modules/users/services";
import { CurrentUser } from "src/common/decorators";
import { CreateUserProfileDto, GetUserProfileDto, UpdateUserProfileDto } from "src/modules/users/common/dto";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { JwtRequiredInfoOrActivationOrFullAccessGuard } from "src/modules/auth/common/guards";
import { CreateUserProfileOutput, UserProfileOutput } from "src/modules/users/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UUIDParamDto } from "src/common/dto";

@Controller("users")
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @SerializeOptions({ strategy: "exposeAll", type: UserProfileOutput })
  @Get(":id/profile-information")
  async findUserProfile(@Param() { id }: UUIDParamDto, @Query() dto: GetUserProfileDto): Promise<UserProfileOutput> {
    return await this.userProfilesService.findUserProfile(id, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @UsePipes(NotEmptyBodyPipe)
  @SerializeOptions({ strategy: "exposeAll", type: UserProfileOutput })
  @Post(":id/profile-information")
  async createUserProfileInformation(
    @Param() { id }: UUIDParamDto,
    @Body() dto: CreateUserProfileDto,
    @CurrentUser() currentUser: ITokenUserData,
  ): Promise<CreateUserProfileOutput> {
    return await this.userProfilesService.createUserProfileInformation(id, dto, currentUser);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch(":id/profile-information")
  async editUserProfile(
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateUserProfileDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.userProfilesService.updateUserProfileInformation(id, dto, user);
  }
}
