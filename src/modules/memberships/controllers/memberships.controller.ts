import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UUIDParamDto } from "src/common/dto";
import { MembershipAssignmentsService, MembershipsService } from "src/modules/memberships/services";
import { Membership, MembershipAssignment } from "src/modules/memberships/entities";
import { UpdateMembershipDto, UpdateMembershipPriceDto } from "src/modules/memberships/common/dto";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { GetUserMembershipsOutput } from "src/modules/memberships/common/outputs";

@Controller("memberships")
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
  ) {}

  @Get("admin")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAdminMemberships(): Promise<Membership[]> {
    return await this.membershipsService.getAdminMemberships();
  }

  @Get("user")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getUserMemberships(@CurrentUser() user: ITokenUserData): Promise<GetUserMembershipsOutput[]> {
    return await this.membershipsService.getUserMemberships(user);
  }

  @Get("status")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getSubscriptionStatus(@CurrentUser() user: ITokenUserData): Promise<MembershipAssignment> {
    return await this.membershipAssignmentsService.getSubscriptionStatus(user);
  }

  @Post("subscription/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async processMembershipSubscription(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.membershipsService.createStripeSubscription(id, user);
  }

  @Post("subscription-cancel")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async cancelStripeSubscription(@CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.membershipsService.cancelStripeSubscription(user);
  }

  @Patch(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  async updateMembership(@Param() { id }: UUIDParamDto, @Body() dto: UpdateMembershipDto): Promise<void> {
    return await this.membershipsService.updateMembership(id, dto);
  }

  @Patch("prices/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateMembershipPrice(@Param() { id }: UUIDParamDto, @Body() dto: UpdateMembershipPriceDto): Promise<void> {
    return await this.membershipsService.updateMembershipPrice(id, dto);
  }

  @Patch("activate/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async activateMembership(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.membershipsService.activateMembership(id);
  }

  @Patch("deactivate/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async deactivateMembership(@Param() { id }: UUIDParamDto): Promise<void> {
    return await this.membershipsService.deactivateMembership(id);
  }
}
