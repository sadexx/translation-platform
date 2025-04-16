import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { In, Repository } from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/entities";
import { Appointment } from "src/modules/appointments/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { Address } from "src/modules/addresses/entities";
import { ICreateAppointmentOrder, ICreateAppointmentOrderGroup } from "src/modules/appointment-orders/common/interface";
import { findOneOrFail } from "src/common/utils";
import { RatesService } from "src/modules/rates/services";
import { GeneralPaymentsService } from "src/modules/payments/services";
import { CreateVirtualAppointmentDto } from "src/modules/appointments/common/dto";
import { ICompanyInfo } from "src/modules/appointments/common/interfaces";
import { ERoleType } from "src/modules/payments/common/enums";
import { AppointmentOrderQueryOptionsService } from "src/modules/appointment-orders-shared/services";
import { SearchTimeFrameService } from "src/modules/search-time-frame/services";
import { COMPANY_LFH_FULL_NAME } from "src/modules/companies/common/constants/constants";
import { INTERPRETER_ROLES } from "src/common/constants";

@Injectable()
export class AppointmentOrderCreateService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderCreateService.name);

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly searchTimeFrameService: SearchTimeFrameService,
    private readonly ratesService: RatesService,
    private readonly generalPaymentsService: GeneralPaymentsService,
  ) {}

  public async constructAndCreateAppointmentOrder(
    appointment: Appointment,
    client: UserRole,
    address?: Address,
    appointmentOrderGroup?: AppointmentOrderGroup,
  ): Promise<void | AppointmentOrder> {
    const createAppointmentOrder = await this.constructAppointmentOrderDto(
      appointment,
      client,
      address,
      appointmentOrderGroup,
    );
    const savedAppointmentOrder = await this.createAppointmentOrder(createAppointmentOrder);

    if (!appointmentOrderGroup && !savedAppointmentOrder.isOrderGroup) {
      return savedAppointmentOrder;
    }
  }

  private async constructAppointmentOrderDto(
    appointment: Appointment,
    client: UserRole,
    address?: Address,
    appointmentOrderGroup?: AppointmentOrderGroup,
  ): Promise<ICreateAppointmentOrder> {
    if (!appointment.clientId) {
      this.lokiLogger.error(`Appointment with id ${appointment.id} does not have clientId (${appointment.clientId})`);

      throw new BadRequestException("Appointment does not have clientId");
    }

    const isGstPayers = this.generalPaymentsService.isIndividualGstPayer(client.country);
    const scheduleDateTime = new Date(appointment.scheduledStartTime).toISOString();
    const approximateCost = await this.ratesService.calculatePriceByOneDay(
      {
        interpreterType: appointment.interpreterType,
        schedulingType: appointment.schedulingType,
        communicationType: appointment.communicationType,
        interpretingType: appointment.interpretingType,
        topic: appointment.topic,
        duration: appointment.schedulingDurationMin,
        scheduleDateTime,
        extraDays: [],
      },
      appointment.schedulingDurationMin,
      scheduleDateTime,
      isGstPayers.client,
      ERoleType.CLIENT,
    );

    const appointmentOrder: ICreateAppointmentOrder = {
      appointment: appointment,
      platformId: appointment.platformId,
      scheduledStartTime: appointment.scheduledStartTime,
      scheduledEndTime: appointment.scheduledEndTime,
      communicationType: appointment.communicationType,
      schedulingType: appointment.schedulingType,
      schedulingDurationMin: appointment.schedulingDurationMin,
      topic: appointment.topic,
      preferredInterpreterGender: appointment.preferredInterpreterGender,
      interpreterType: appointment.interpreterType,
      interpretingType: appointment.interpretingType,
      languageFrom: appointment.languageFrom,
      languageTo: appointment.languageTo,
      clientPlatformId: client.user.platformId,
      clientFirstName: client.profile.firstName,
      clientLastName: client.profile.lastName,
      participantType: appointment.participantType,
      nextRepeatTime: null,
      repeatInterval: null,
      remainingRepeats: null,
      notifyAdmin: null,
      endSearchTime: null,
      operatedByCompanyName: client.operatedByCompanyName,
      operatedByCompanyId: client.operatedByCompanyId,
      timeToRestart: null,
      isFirstSearchCompleted: false,
      isSecondSearchCompleted: false,
      isSearchNeeded: false,
      isCompanyHasInterpreters: null,
      approximateCost: approximateCost.price,
      acceptOvertimeRates: appointment.acceptOvertimeRates,
      timezone: appointment.timezone,
      address: address ?? null,
    };

    if (appointmentOrderGroup) {
      return {
        ...appointmentOrder,
        appointmentOrderGroup,
        isOrderGroup: true,
        isFirstSearchCompleted: null,
        isSecondSearchCompleted: null,
        isSearchNeeded: null,
        acceptOvertimeRates: null,
        timezone: null,
      };
    } else {
      const { nextRepeatTime, repeatInterval, remainingRepeats, notifyAdmin, endSearchTime } =
        await this.searchTimeFrameService.calculateInitialTimeFrames(
          appointment.communicationType,
          appointment.scheduledStartTime,
        );
      const isCompanyHasInterpreters = await this.determineIfCompanyHasInterpreters(
        client.operatedByCompanyId,
        client.operatedByCompanyName,
      );

      return {
        ...appointmentOrder,
        isOrderGroup: false,
        nextRepeatTime: nextRepeatTime,
        repeatInterval: repeatInterval,
        remainingRepeats: remainingRepeats,
        notifyAdmin: notifyAdmin,
        endSearchTime: endSearchTime,
        isCompanyHasInterpreters: isCompanyHasInterpreters,
      };
    }
  }

  public async createAppointmentOrder(dto: ICreateAppointmentOrder): Promise<AppointmentOrder> {
    const newAppointmentOrder = this.appointmentOrderRepository.create(dto);
    const savedAppointmentOrder = await this.appointmentOrderRepository.save(newAppointmentOrder);

    return savedAppointmentOrder;
  }

  public async constructAndCreateAppointmentOrderGroup(
    dto: CreateVirtualAppointmentDto,
    company: ICompanyInfo,
  ): Promise<AppointmentOrderGroup> {
    const createAppointmentOrder = await this.constructAppointmentOrderGroup(dto, company);

    return await this.createAppointmentOrderGroup(createAppointmentOrder);
  }

  private async constructAppointmentOrderGroup(
    dto: CreateVirtualAppointmentDto,
    company: ICompanyInfo,
  ): Promise<ICreateAppointmentOrderGroup> {
    const isCompanyHasInterpreters = await this.determineIfCompanyHasInterpreters(
      company.operatedByCompanyId,
      company.operatedByCompanyName,
    );

    return {
      sameInterpreter: dto.sameInterpreter,
      operatedByCompanyName: company.operatedByCompanyName,
      operatedByCompanyId: company.operatedByCompanyId,
      isCompanyHasInterpreters: isCompanyHasInterpreters,
      acceptOvertimeRates: dto.acceptOvertimeRates,
      timezone: company.timezone,
    };
  }

  private async createAppointmentOrderGroup(dto: ICreateAppointmentOrderGroup): Promise<AppointmentOrderGroup> {
    const newAppointmentOrderGroup = this.appointmentOrderGroupRepository.create(dto);

    return await this.appointmentOrderGroupRepository.save(newAppointmentOrderGroup);
  }

  private async determineIfCompanyHasInterpreters(companyId: string, companyName: string): Promise<boolean> {
    if (companyName === COMPANY_LFH_FULL_NAME) {
      return true;
    }

    return await this.userRoleRepository.exists({
      where: {
        operatedByCompanyId: companyId,
        operatedByCompanyName: companyName,
        role: { name: In(INTERPRETER_ROLES) },
      },
      relations: {
        role: true,
      },
    });
  }

  public async calculateTimeFramesForOrderGroup(id: string): Promise<void> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getFirstScheduledAppointmentOptions(id);
    const firstScheduledAppointment = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const { nextRepeatTime, repeatInterval, remainingRepeats, notifyAdmin, endSearchTime } =
      await this.searchTimeFrameService.calculateInitialTimeFrames(
        firstScheduledAppointment.communicationType,
        firstScheduledAppointment.scheduledStartTime,
      );

    if (!nextRepeatTime) {
      throw new BadRequestException("Unable to calculate next repeat time for appointment order group");
    }

    await this.appointmentOrderGroupRepository.update(id, {
      nextRepeatTime: nextRepeatTime,
      repeatInterval: repeatInterval,
      remainingRepeats: remainingRepeats,
      notifyAdmin: notifyAdmin,
      endSearchTime: endSearchTime,
    });
  }
}
