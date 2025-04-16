import { Controller, Get, Query, UseGuards, UsePipes } from "@nestjs/common";
import { AdminService } from "src/modules/admin/services";
import {
  GetUserDocumentsDto,
  GetUserInterpreterProfileDto,
  GetUserPaymentsDto,
  GetUserProfileDto,
  GetUsersDto,
  GetUserStepsDto,
} from "src/modules/admin/common/dto";
import { IAccountRequiredStepsData } from "src/modules/account-activation/common/interfaces";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { GetUserDocumentsOutput, GetUserProfileOutput, GetUsersOutput } from "src/modules/admin/common/output";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IGetUserPaymentResponse } from "src/modules/admin/common/interfaces";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("users")
  async getUsers(@Query() dto: GetUsersDto): Promise<GetUsersOutput> {
    return this.adminService.getUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("user-documents")
  async getUserDocuments(@Query() dto: GetUserDocumentsDto): Promise<GetUserDocumentsOutput> {
    return this.adminService.getUserDocuments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("user-profile")
  async getUserProfile(@Query() dto: GetUserProfileDto): Promise<GetUserProfileOutput> {
    return this.adminService.getUserProfile(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("user-steps")
  async getUserSteps(
    @Query() dto: GetUserStepsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IAccountRequiredStepsData> {
    return this.adminService.getUserSteps(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("interpreter-profile")
  async getUserInterpreterProfile(@Query() dto: GetUserInterpreterProfileDto): Promise<InterpreterProfile | null> {
    return this.adminService.getUserInterpreterProfile(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("user-payments")
  async getUserPayments(@Query() dto: GetUserPaymentsDto): Promise<IGetUserPaymentResponse> {
    return this.adminService.getUserPayments(dto);
  }
}
