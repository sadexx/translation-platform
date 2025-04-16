import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { EmailsModule } from "src/modules/emails/emails.module";
import {
  AppleMobileStrategy,
  AppleWebStrategy,
  GoogleMobileStrategy,
  GoogleWebStrategy,
  JwtActivationAccessStrategy,
  JwtActivationRefreshStrategy,
  JwtEmailConfirmationStrategy,
  JwtFullAccessStrategy,
  JwtFullRefreshStrategy,
  JwtRegistrationStrategy,
  JwtRequiredInfoRefreshStrategy,
  JwtResetPasswordStrategy,
  JwtRoleSelectionStrategy,
} from "src/modules/auth/common/strategies";
import { SessionsModule } from "src/modules/sessions/sessions.module";
import { AddressAndDeviceAuthenticationMiddleware } from "src/modules/auth/common/middlewares";
import { UsersRolesModule } from "src/modules/users-roles/users-roles.module";
import {
  AuthRegistrationService,
  AuthService,
  RegistrationLinkService,
  RegistrationService,
  ThirdPartyService,
} from "src/modules/auth/services";
import { UsersModule } from "src/modules/users/users.module";
import { AwsPinpointModule } from "src/modules/aws-pinpoint/aws-pinpoint.module";
import {
  AuthController,
  RegistrationController,
  RegistrationLinkController,
  ThirdPartyAuthController,
} from "src/modules/auth/controllers";
import { JwtEmailConfirmationModule } from "src/modules/tokens/common/libs/email-confirmation-token";
import { JwtRoleSelectionModule } from "src/modules/tokens/common/libs/role-selection-token";
import { JwtRegistrationModule } from "src/modules/tokens/common/libs/registration-token";
import { JwtRequiredInfoAccessStrategy } from "src/modules/auth/common/strategies/jwt-required-info-access.strategy";
import { MockModule } from "src/modules/mock/mock.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Company } from "src/modules/companies/entities";
import { JwtRestorationStrategy } from "src/modules/auth/common/strategies/jwt-restoration.strategy";
import { Role } from "src/modules/roles/entities";
import { UserAvatarsModule } from "src/modules/user-avatars/user-avatars.module";
import { Address } from "src/modules/addresses/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Role, Company, Address]),

    JwtRegistrationModule,
    JwtRoleSelectionModule,
    JwtEmailConfirmationModule,

    UsersRolesModule,
    SessionsModule,
    AwsPinpointModule,
    EmailsModule,
    MockModule,
    TokensModule,
    UserAvatarsModule,
    UsersModule,
    HelperModule,
    ChimeMessagingConfigurationModule,
  ],
  controllers: [AuthController, ThirdPartyAuthController, RegistrationController, RegistrationLinkController],
  providers: [
    AuthService,
    RegistrationService,
    RegistrationLinkService,
    AuthRegistrationService,
    ThirdPartyService,

    JwtRequiredInfoAccessStrategy,
    JwtRequiredInfoRefreshStrategy,
    JwtActivationAccessStrategy,
    JwtActivationRefreshStrategy,
    JwtFullAccessStrategy,
    JwtFullRefreshStrategy,

    JwtEmailConfirmationStrategy,
    JwtRegistrationStrategy,
    JwtRoleSelectionStrategy,
    JwtResetPasswordStrategy,
    JwtRestorationStrategy,

    GoogleWebStrategy,
    GoogleMobileStrategy,
    AppleWebStrategy,
    AppleMobileStrategy,
  ],
  exports: [JwtResetPasswordStrategy, RegistrationLinkService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AddressAndDeviceAuthenticationMiddleware)
      .forRoutes(AuthController, ThirdPartyAuthController, RegistrationController);
  }
}
