import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InterpreterProfile, LanguagePair } from "src/modules/interpreter-profile/entities";
import { Not, Repository } from "typeorm";
import { Company } from "src/modules/companies/entities";
import {
  INTERPRETER_ROLES,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_QUARTER_HOUR,
} from "src/common/constants";
import { User } from "src/modules/users/entities";
import { GetDropdownCompaniesDto, GetDropdownUsersDto } from "src/modules/toolbox/common/dto";
import { ToolboxQueryOptionsService } from "src/modules/toolbox/services";
import {
  GetActiveAndInactiveLanguagesOutput,
  GetInterpreterAvailabilityOutput,
  GetSidebarMessagesOutput,
} from "src/modules/toolbox/common/outputs";
import { ELanguages, ESignLanguages } from "src/modules/interpreter-profile/common/enum";
import { AppointmentOrder } from "src/modules/appointment-orders/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";
import { Appointment } from "src/modules/appointments/entities";
import { HelperService } from "src/modules/helper/services";
import { Notification } from "src/modules/notifications/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { RedisService } from "src/modules/redis/services";
import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";

@Injectable()
export class ToolboxService {
  constructor(
    @InjectRepository(LanguagePair)
    private readonly languagePairRepository: Repository<LanguagePair>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(ChannelMembership)
    private readonly channelMembershipRepository: Repository<ChannelMembership>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly toolboxQueryOptionsService: ToolboxQueryOptionsService,
    private readonly redisService: RedisService,
    private readonly helperService: HelperService,
  ) {}

  public async getLanguagesAvailability(): Promise<GetActiveAndInactiveLanguagesOutput> {
    const CACHE_KEY = "languages-availability";
    const cachedData = await this.redisService.getJson<GetActiveAndInactiveLanguagesOutput>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const queryOptions = this.toolboxQueryOptionsService.getActiveLanguagesOptions();
    const result: { language: string }[] = (await this.languagePairRepository.query(queryOptions)) as {
      language: string;
    }[];

    const allLanguages = Object.values(ELanguages);
    const activeLanguages = result.map((row) => row.language);
    const activeLanguagesSet = new Set(activeLanguages);
    const inactiveLanguages = allLanguages.filter((language) => !activeLanguagesSet.has(language));

    await this.redisService.setJson(
      CACHE_KEY,
      { activeLanguages, inactiveLanguages, signLanguages: ESignLanguages },
      NUMBER_OF_MINUTES_IN_QUARTER_HOUR * NUMBER_OF_MINUTES_IN_HOUR,
    );

    return { activeLanguages, inactiveLanguages, signLanguages: ESignLanguages };
  }

  public async getDropdownCompanies(dto: GetDropdownCompaniesDto): Promise<Company[]> {
    const queryBuilder = this.companyRepository.createQueryBuilder("company");
    this.toolboxQueryOptionsService.getDropdownCompaniesOptions(queryBuilder, dto);

    return queryBuilder.getMany();
  }

  public async getDropdownUsers(dto: GetDropdownUsersDto, user: ITokenUserData): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    const userRole = await this.helperService.getUserRoleById(user.userRoleId);
    this.toolboxQueryOptionsService.getDropdownUsersOptions(queryBuilder, dto, userRole);

    return queryBuilder.getMany();
  }

  public async getSidebarMessages(user: IWebSocketUserData): Promise<GetSidebarMessagesOutput> {
    let hasNewCompanyRequests: boolean = false;
    let hasAppointmentOrders: boolean = false;

    if ([EUserRoleName.SUPER_ADMIN, EUserRoleName.LFH_BOOKING_OFFICER].includes(user.role)) {
      const hasNewCompanyRequestsQueryBuilder = this.companyRepository.createQueryBuilder("company");
      this.toolboxQueryOptionsService.hasNewCompanyRequestsQueryOptions(hasNewCompanyRequestsQueryBuilder);
      hasNewCompanyRequests = await hasNewCompanyRequestsQueryBuilder.getExists();
    }

    if (INTERPRETER_ROLES.includes(user.role)) {
      const hasAppointmentOrdersQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("order");
      this.toolboxQueryOptionsService.hasAppointmentOrdersQueryOptions(
        hasAppointmentOrdersQueryBuilder,
        user.userRoleId,
      );
      hasAppointmentOrders = await hasAppointmentOrdersQueryBuilder.getExists();
    }

    const hasUnreadChannelMessages = await this.channelMembershipRepository.exists({
      where: { externalUserId: user.userRoleId, unreadMessagesCount: Not(0) },
    });

    const hasUnreadNotifications = await this.notificationRepository.exists({
      where: { userRoleId: user.userRoleId, isViewed: false },
    });

    return {
      hasNewCompanyRequests,
      hasAppointmentOrders,
      hasUnreadChannelMessages,
      hasUnreadNotifications,
    };
  }

  public async getInterpretersAvailability(user: ITokenUserData): Promise<GetInterpreterAvailabilityOutput> {
    const CACHE_KEY = "interpreters-availability";
    const cachedData = await this.redisService.getJson<GetInterpreterAvailabilityOutput>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const currentDate = new Date();
    const userRole = await this.helperService.getUserRoleById(user.userRoleId);

    const busyInterpretersQueryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.toolboxQueryOptionsService.busyInterpretersQueryOptions(busyInterpretersQueryBuilder, userRole);
    const busyInterpretersRows = await busyInterpretersQueryBuilder.getRawMany<Appointment>();

    const busyInterpreterIds = Array.from(new Set(busyInterpretersRows.map((row) => row.interpreterId)));
    const busyInterpretersCount = busyInterpreterIds.length;

    const onlineInterpretersQueryBuilder = this.interpreterProfileRepository.createQueryBuilder("interpreterProfile");
    this.toolboxQueryOptionsService.onlineInterpretersQueryOptions(
      onlineInterpretersQueryBuilder,
      currentDate,
      busyInterpreterIds,
      userRole,
    );
    const onlineInterpretersCount = await onlineInterpretersQueryBuilder.getCount();

    const offlineInterpretersQueryBuilder = this.userRoleRepository.createQueryBuilder("userRole");
    this.toolboxQueryOptionsService.offlineInterpretersQueryOptions(
      offlineInterpretersQueryBuilder,
      currentDate,
      busyInterpreterIds,
      userRole,
    );
    const offlineInterpretersCount = await offlineInterpretersQueryBuilder.getCount();

    await this.redisService.setJson(
      CACHE_KEY,
      { onlineInterpretersCount, busyInterpretersCount, offlineInterpretersCount },
      NUMBER_OF_MINUTES_IN_FIVE_MINUTES * NUMBER_OF_MINUTES_IN_HOUR,
    );

    return {
      onlineInterpretersCount,
      busyInterpretersCount,
      offlineInterpretersCount,
    };
  }
}
