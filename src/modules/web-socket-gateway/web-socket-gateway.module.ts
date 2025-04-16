import { Module } from "@nestjs/common";
import { AppointmentOrdersModule } from "src/modules/appointment-orders/appointment-orders.module";
import { OrderGateway } from "src/modules/web-socket-gateway/ws-gateway/orders.gateway";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { CustomPrometheusModule } from "src/modules/prometheus/prometheus.module";
import { LiveMeetingGateway } from "src/modules/web-socket-gateway/ws-gateway/live-meetings.gateway";
import { AppointmentsModule } from "src/modules/appointments/appointments.module";
import { ChannelGateway } from "src/modules/web-socket-gateway/ws-gateway/channels.gateway";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import {
  ActiveChannelStorageService,
  ConnectionStorageService,
  EventStorageService,
} from "src/modules/web-socket-gateway/common/storages";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { InterpreterProfileModule } from "src/modules/interpreter-profile/interpreter-profile.module";
import { EventsGateway } from "src/modules/web-socket-gateway/ws-gateway/events.gateway";
import { ToolboxModule } from "src/modules/toolbox/toolbox.module";

@Module({
  imports: [
    AppointmentOrdersModule,
    AppointmentsModule,
    TokensModule,
    CustomPrometheusModule,
    ChimeMessagingConfigurationModule,
    NotificationModule,
    InterpreterProfileModule,
    ToolboxModule,
  ],
  providers: [
    OrderGateway,
    LiveMeetingGateway,
    ChannelGateway,
    EventsGateway,
    ConnectionStorageService,
    ActiveChannelStorageService,
    EventStorageService,
  ],
  exports: [OrderGateway, LiveMeetingGateway, ChannelGateway, EventsGateway],
})
export class WebSocketGatewayModule {}
