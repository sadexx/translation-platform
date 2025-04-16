import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import {
  SearchEngineLogicService,
  SearchEngineNotificationService,
  SearchEngineOnDemandService,
  SearchEnginePreBookGroupService,
  SearchEnginePreBookOrderService,
  SearchEngineQueryService,
  SearchEngineStepService,
} from "src/modules/search-engine-logic/services";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([InterpreterProfile, AppointmentOrder, AppointmentOrderGroup]),
    NotificationModule,
    HelperModule,
  ],
  controllers: [],
  providers: [
    SearchEngineLogicService,
    SearchEngineOnDemandService,
    SearchEnginePreBookOrderService,
    SearchEnginePreBookGroupService,
    SearchEngineStepService,
    SearchEngineQueryService,
    SearchEngineNotificationService,
  ],
  exports: [SearchEngineLogicService],
})
export class SearchEngineLogicModule {}
