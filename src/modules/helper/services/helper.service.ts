import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Not, Repository, FindOptionsRelations } from "typeorm";
import { Company } from "src/modules/companies/entities";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";
import { EUserRoleName } from "src/modules/roles/common/enums";
import {
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_THREE_HOURS,
  NUMBER_OF_SECONDS_IN_HOUR,
  ONE_HUNDRED,
} from "src/common/constants";
import { findOneOrFail } from "src/common/utils";
import { DiscountHolder } from "src/modules/discounts/entities";
import { DiscountEntity, DiscountEntityHolder } from "src/modules/discounts/common/types";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES,
  LFH_PERSONAL_ROLES,
} from "src/modules/companies/common/constants/constants";
import { ECompanyType } from "src/modules/companies/common/enums";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { ESortOrder } from "src/common/enums";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments-shared/common/constants";
import { UpdateAppointmentDto } from "src/modules/appointments/common/dto";
import { EAppointmentCommunicationType, EAppointmentStatus } from "src/modules/appointments/common/enums";
import { LokiLogger } from "src/common/logger";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { Session } from "src/modules/sessions/entities";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { RedisService } from "src/modules/redis/services";
import { CreateInterpreterQuestionnaireDto } from "src/modules/interpreter-questionnaire/common/dto";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { EExtCheckStatus, EExtCheckResult, EManualCheckResult } from "src/modules/backy-check/common/enums";
import { UpdateInterpreterProfileDto } from "src/modules/interpreter-profile/common/dto";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { differenceInHours, differenceInMilliseconds, isWithinInterval, subHours } from "date-fns";

@Injectable()
export class HelperService {
  private readonly lokiLogger = new LokiLogger(HelperService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(DiscountHolder)
    private readonly discountHolderRepository: Repository<DiscountHolder>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    private readonly redisService: RedisService,
  ) {}

  /**
   ** User Repository
   */

  public async getSuperAdmin(): Promise<User[]> {
    return await this.userRepository.find({
      where: { userRoles: { role: { name: EUserRoleName.SUPER_ADMIN } } },
      select: { email: true },
    });
  }

  /**
   ** UserRole Repository
   */

  public async getAllLfhAdmins(): Promise<UserRole[]> {
    const CACHE_KEY = "lfh-admins";
    const ALLOWED_ROLES: EUserRoleName[] = [EUserRoleName.SUPER_ADMIN, EUserRoleName.LFH_BOOKING_OFFICER];
    const cachedData = await this.redisService.getJson<UserRole[]>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const lfhAdmins = await this.userRoleRepository.find({
      select: {
        id: true,
        role: {
          name: true,
        },
      },
      where: {
        role: { name: In(ALLOWED_ROLES) },
      },
      relations: {
        role: true,
      },
    });

    if (lfhAdmins.length === 0) {
      this.lokiLogger.error("No Admins found in Lfh Company");
      throw new BadRequestException("No Admins found in Lfh Company");
    }

    await this.redisService.setJson(CACHE_KEY, lfhAdmins, NUMBER_OF_SECONDS_IN_HOUR);

    return lfhAdmins;
  }

  private async getCompanyByRoleCorporateInterpretingProviderCorporateClient(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

    if (!personalUserRole) {
      throw new BadRequestException("Operator company admin not exist!");
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations,
    });

    if (!company) {
      throw new BadRequestException("Company not exist!");
    }

    if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      if (company.operatedBy !== personalUserRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    } else {
      if (company.id !== personalUserRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    return company;
  }

  public async getUserRoleById(id: string, relations?: FindOptionsRelations<UserRole>): Promise<UserRole> {
    const userRole = await findOneOrFail(id, this.userRoleRepository, {
      where: { id },
      relations,
    });

    return userRole;
  }

  private async getOwnCompanyByRole(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
  ): Promise<Company | null> {
    const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

    if (!personalUserRole) {
      throw new BadRequestException("User not found!");
    }

    return await this.companyRepository.findOne({
      where: { id: personalUserRole.operatedByCompanyId },
      relations,
    });
  }

  /**
   ** Company Repository
   */

  public async getCompanyById(id: string): Promise<Company> {
    const company = await findOneOrFail(id, this.companyRepository, { where: { id: id } });

    return company;
  }

  public async getCompanyByRole(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    if (LFH_PERSONAL_ROLES.includes(user.role)) {
      return await this.getCompanyByRoleLfhPersonal(relations, companyId);
    } else if (CORPORATE_INTERPRETING_PROVIDERS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      return await this.getCompanyByRoleCorporateInterpretingProvider(user, relations, companyId);
    } else {
      return await this.getOwnCompanyByRole(user, relations);
    }
  }

  private async getCompanyByRoleLfhPersonal(
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    if (!companyId) {
      throw new BadRequestException("Please, set company id!");
    }

    return await this.companyRepository.findOne({
      where: { id: companyId },
      relations,
    });
  }

  private async getCompanyByRoleCorporateInterpretingProvider(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    if (companyId) {
      return await this.getCompanyByRoleCorporateInterpretingProviderCorporateClient(user, relations, companyId);
    } else {
      return await this.getOwnCompanyByRole(user, relations);
    }
  }

  /**
   ** DiscountHolder Repository
   */

  public async getDiscountHolderForValidation(
    holder: DiscountEntityHolder,
    discountEntity?: DiscountEntity,
  ): Promise<DiscountHolder | null> {
    return await this.discountHolderRepository
      .createQueryBuilder("discountHolder")
      .leftJoinAndSelect("discountHolder.userRole", "userRole")
      .leftJoinAndSelect("discountHolder.company", "company")
      .leftJoinAndSelect("discountHolder.promoCampaign", "promoCampaign")
      .where("company.id = :companyId", { companyId: holder.id })
      .orWhere("promoCampaign.id = :promoCampaignId AND userRole.id = :userRoleId", {
        promoCampaignId: discountEntity?.id,
        userRoleId: holder.id,
      })
      .orWhere("promoCampaign.id = :promoCampaignId AND userRole.id IS NOT NULL", {
        promoCampaignId: discountEntity?.id,
      })
      .getOne();
  }

  /**
   ** Appointment Repository
   */

  public async checkIfUserHasUncompletedAppointmentsBeforeDelete(userRoleId: string): Promise<void> {
    const uniqueUncompletedAppointmentStatuses = await this.getUniqueUncompletedAppointmentStatuses(userRoleId);

    if (uniqueUncompletedAppointmentStatuses.length > 0) {
      throw new BadRequestException({
        message: "User has non-completed appointments and cannot be deleted.",
        uncompletedAppointmentStatuses: uniqueUncompletedAppointmentStatuses,
      });
    }
  }

  public async getUniqueUncompletedAppointmentStatuses(userRoleId: string): Promise<EAppointmentStatus[]> {
    const uncompletedAppointmentsWithUniqueStatuses = await this.appointmentRepository
      .createQueryBuilder("appointment")
      .select("DISTINCT appointment.status", "status")
      .leftJoin("appointment.client", "client")
      .leftJoin("appointment.interpreter", "interpreter")
      .where("appointment.status NOT IN (:...completedStatuses)", {
        completedStatuses: COMPLETED_APPOINTMENT_STATUSES,
      })
      .andWhere("(client.id = :userRoleId OR interpreter.id = :userRoleId)", { userRoleId })
      .getRawMany<Appointment>();

    return uncompletedAppointmentsWithUniqueStatuses.map((appointment) => appointment.status);
  }

  public async getUnpaidAppointmentsForMembershipAssignment(
    userRoleId: string,
    membershipAssignment: MembershipAssignment,
  ): Promise<Appointment[]> {
    const relevantAppointments = await this.appointmentRepository.find({
      where: {
        scheduledStartTime: Between(membershipAssignment.startDate, membershipAssignment.endDate),
        paidByClient: 0,
        client: { id: userRoleId },
        status: Not(In(COMPLETED_APPOINTMENT_STATUSES)),
      },
      order: {
        scheduledStartTime: ESortOrder.ASC,
      },
      relations: { discountAssociation: { promoCampaign: true } },
    });

    return relevantAppointments;
  }

  public async updateAppointmentStatus(appointmentId: string, status: EAppointmentStatus): Promise<void> {
    const updateData: Partial<Appointment> = { status };

    if (status === EAppointmentStatus.PENDING) {
      updateData.interpreter = null;
    }

    await this.appointmentRepository.update(appointmentId, updateData);
  }

  public async updateAppointmentChannel(appointment: Appointment, channel: Channel): Promise<void> {
    await this.appointmentRepository.update(appointment.id, {
      channelId: channel.id,
    });
  }

  public async getChannelAppointment(id: string): Promise<Appointment> {
    const appointment = await findOneOrFail(id, this.appointmentRepository, {
      select: {
        id: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        communicationType: true,
        schedulingType: true,
        interpretingType: true,
        platformId: true,
        status: true,
        archivedByClient: true,
        languageFrom: true,
        languageTo: true,
        appointmentsGroupId: true,
        clientId: true,
        channelId: true,
      },
      where: { id },
      relations: { address: true },
    });

    return appointment;
  }

  public async getChannelAppointments(appointmentsGroupId: string): Promise<Appointment[]> {
    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        communicationType: true,
        schedulingType: true,
        interpretingType: true,
        platformId: true,
        status: true,
        archivedByClient: true,
        languageFrom: true,
        languageTo: true,
        appointmentsGroupId: true,
        address: {
          id: true,
          streetNumber: true,
          streetName: true,
          state: true,
          suburb: true,
          postcode: true,
          country: true,
        },
      },
      where: {
        appointmentsGroupId: appointmentsGroupId,
      },
      relations: { address: true },
    });

    if (!appointments) {
      throw new NotFoundException("Appointments not found.");
    }

    return appointments;
  }

  public async isInterpreterUnassignedFromGroupAppointments(
    userRoleId: string,
    appointmentsGroupId: string,
  ): Promise<boolean> {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder("appointment")
      .where("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId })
      .andWhere("appointment.interpreter_id = :userRoleId", { userRoleId });
    const result = await queryBuilder.getCount();

    return result === 0;
  }

  public async getAppointmentsLinkedToChannelGroup(channelIds: string[]): Promise<Appointment[]> {
    return await this.appointmentRepository.find({
      select: {
        id: true,
        status: true,
        channelId: true,
      },
      where: {
        channelId: In(channelIds),
      },
    });
  }

  /**
   ** AppointmentAdminInfo Repository
   */

  public async disableRedFlag(appointments: Appointment | Appointment[]): Promise<void> {
    const appointmentsArray = Array.isArray(appointments) ? appointments : [appointments];
    const adminInfoIds = this.fetchAdminInfoIds(appointmentsArray);

    if (adminInfoIds.length > 0) {
      await this.appointmentAdminInfoRepository.update({ id: In(adminInfoIds) }, { isRedFlagEnabled: false });
    }
  }

  private fetchAdminInfoIds(appointments: Appointment[]): string[] {
    const adminInfoIds: string[] = [];
    for (const appointment of appointments) {
      if (appointment.appointmentAdminInfo?.id) {
        adminInfoIds.push(appointment.appointmentAdminInfo.id);
      } else {
        this.lokiLogger.error(`No Appointment Admin Info found for appointment Id: ${appointment.id}`);
      }
    }

    return adminInfoIds;
  }

  public async enableRedFlagWithMessage(id: string, message: string): Promise<void> {
    await this.appointmentAdminInfoRepository.update(id, {
      isRedFlagEnabled: true,
      message: message,
    });
  }

  public async updateClientOnlineMarking(meetingConfigId: string, appointmentAdminInfoId: string): Promise<void> {
    await this.chimeMeetingConfigurationRepository.update(meetingConfigId, {
      isClientWasOnlineInBooking: true,
    });

    await this.appointmentAdminInfoRepository.update(appointmentAdminInfoId, {
      clientWasOnlineInBooking: new Date(),
    });
  }

  public async updateInterpreterOnlineMarking(meetingConfigId: string, appointmentAdminInfoId: string): Promise<void> {
    await this.chimeMeetingConfigurationRepository.update(meetingConfigId, {
      isInterpreterWasOnlineInBooking: true,
    });

    await this.appointmentAdminInfoRepository.update(appointmentAdminInfoId, {
      interpreterWasOnlineInBooking: new Date(),
    });
  }

  /**
   ** AppointmentReminder Repository
   */

  public async deleteAppointmentReminder(appointmentReminder: AppointmentReminder): Promise<void> {
    await this.appointmentReminderRepository.remove(appointmentReminder);
  }

  /**
   ** InterpreterProfile Repository
   */

  public async makeOfflineInterpreterBeforeOnDemand(interpreterId: string): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: interpreterId } },
      {
        isOnlineForAudio: false,
        isOnlineForVideo: false,
        isOnlineForFaceToFace: false,
      },
    );
  }

  public async makeOnlineInterpreterAfterOnDemand(interpreterId: string): Promise<void> {
    const interpreterProfile = await findOneOrFail(interpreterId, this.interpreterProfileRepository, {
      select: {
        id: true,
        audioOnDemandSetting: true,
        videoOnDemandSetting: true,
        faceToFaceOnDemandSetting: true,
      },
      where: { userRole: { id: interpreterId } },
    });

    const interpreterUpdatePayload: Partial<InterpreterProfile> = {};

    if (interpreterProfile.audioOnDemandSetting) {
      interpreterUpdatePayload.isOnlineForAudio = true;
    }

    if (interpreterProfile.videoOnDemandSetting) {
      interpreterUpdatePayload.isOnlineForVideo = true;
    }

    if (interpreterProfile.faceToFaceOnDemandSetting) {
      interpreterUpdatePayload.isOnlineForFaceToFace = true;
    }

    await this.interpreterProfileRepository.update(interpreterProfile.id, interpreterUpdatePayload);
  }

  /**
   ** Session Repository
   */

  public async getAllUserSessions(userRoleId: string): Promise<Session[]> {
    return await this.sessionsRepository.find({
      where: { userRoleId: userRoleId },
    });
  }

  public async getActiveUserSessions(userRoleId: string): Promise<Session[]> {
    return await this.sessionsRepository.find({
      where: { userRoleId: userRoleId, user: { userRoles: { id: userRoleId, isActive: true } } },
    });
  }

  public async getRegisteredUserSessions(userRoleId: string): Promise<Session[]> {
    return await this.sessionsRepository.find({
      where: { userRoleId: userRoleId, user: { userRoles: { id: userRoleId, isRegistrationFinished: true } } },
    });
  }

  /**
   ** ChimeMeetingConfiguration Repository
   */

  public async deleteChimeMeetingWithAttendees(meetingConfig: ChimeMeetingConfiguration): Promise<void> {
    await this.chimeMeetingConfigurationRepository.remove(meetingConfig);
  }

  /**
   ** Other Without Repository
   */

  public async getUserRoleByName(user: User, roleName: EUserRoleName | EUserRoleName[]): Promise<UserRole> {
    const userRole = user.userRoles.find((userRole) =>
      Array.isArray(roleName) ? roleName.includes(userRole.role.name) : userRole.role.name === roleName,
    );

    if (!userRole) {
      throw new NotFoundException(`The specified role was not found.`);
    }

    return userRole;
  }

  public async convertImageToBase64(imageUrl: string, userRoleId: string): Promise<string> {
    const CACHE_KEY = `base64avatar:${userRoleId}`;
    const cachedData = await this.redisService.get(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch image from ${imageUrl}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type");
      const base64Image = `data:${mimeType};base64,${base64}`;

      await this.redisService.set(CACHE_KEY, base64Image, NUMBER_OF_MINUTES_IN_THREE_HOURS * NUMBER_OF_MINUTES_IN_HOUR);

      return base64Image;
    } catch (error) {
      this.lokiLogger.error(`Error converting image to Base64: ${(error as Error).message}, ${(error as Error).stack}`);
      throw new InternalServerErrorException("An unexpected error occurred while converting the image.");
    }
  }

  public async isAppointmentChangesRestrictedByTimeLimits(
    appointment: Appointment,
    dto: UpdateAppointmentDto,
    isAddressUpdate: boolean = false,
  ): Promise<void> {
    if (appointment.status === EAppointmentStatus.PENDING) {
      return;
    }

    const FACE_TO_FACE_TIME_LIMIT_HOURS = 24;
    const VIRTUAL_TIME_LIMIT_HOURS = 12;

    const currentTime = new Date();
    const hoursUntilAppointment = differenceInHours(appointment.scheduledStartTime, currentTime);

    const isFaceToFace = appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const timeLimit = isFaceToFace ? FACE_TO_FACE_TIME_LIMIT_HOURS : VIRTUAL_TIME_LIMIT_HOURS;

    const isRestricted =
      (dto.scheduledStartTime && hoursUntilAppointment < timeLimit) ||
      (dto.schedulingDurationMin && hoursUntilAppointment < timeLimit) ||
      (dto.topic && hoursUntilAppointment < timeLimit) ||
      (dto.preferredInterpreterGender && hoursUntilAppointment < timeLimit) ||
      (dto.languageFrom && hoursUntilAppointment < timeLimit) ||
      (dto.languageTo && hoursUntilAppointment < timeLimit) ||
      (isFaceToFace && isAddressUpdate && hoursUntilAppointment < FACE_TO_FACE_TIME_LIMIT_HOURS);

    if (isRestricted) {
      throw new BadRequestException(`Updates are not allowed within ${timeLimit} hours of the appointment.`);
    }
  }

  public isAppointmentCancellationRestrictedByTimeLimits(appointment: Appointment): boolean {
    if (appointment.status === EAppointmentStatus.PENDING) {
      return false;
    }

    const { scheduledStartTime, creationDate } = appointment;

    const CANCELLATION_REFUND_WINDOW_HOURS = 24;
    const REFUND_THRESHOLD_PERCENTAGE = 30;

    const FACE_TO_FACE_TIME_LIMIT_HOURS = 24;
    const VIRTUAL_TIME_LIMIT_HOURS = 12;

    const currentTime = new Date();
    const hoursUntilAppointment = differenceInHours(scheduledStartTime, currentTime);

    const isFaceToFace = appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const timeLimit = isFaceToFace ? FACE_TO_FACE_TIME_LIMIT_HOURS : VIRTUAL_TIME_LIMIT_HOURS;

    const createdWithinLast24h = isWithinInterval(creationDate, {
      start: subHours(currentTime, CANCELLATION_REFUND_WINDOW_HOURS),
      end: scheduledStartTime,
    });

    if (createdWithinLast24h) {
      const totalTimeMs = differenceInMilliseconds(scheduledStartTime, creationDate);
      const remainingTimeMs = differenceInMilliseconds(scheduledStartTime, currentTime);
      const remainingPercent = (remainingTimeMs / totalTimeMs) * ONE_HUNDRED;

      if (remainingPercent >= REFUND_THRESHOLD_PERCENTAGE) {
        return false;
      }
    }

    return hoursUntilAppointment < timeLimit;
  }

  public validateWWCCRequirements(
    dto: CreateInterpreterQuestionnaireDto | UpdateInterpreterProfileDto,
    user: ITokenUserData,
    userRole: UserRole,
  ): void {
    const hasFaceToFaceSetting = dto.faceToFaceOnDemandSetting || dto.faceToFacePreBookedSetting;
    const isProfessionalInterpreterFromAustralia =
      user.role === EUserRoleName.IND_PROFESSIONAL_INTERPRETER && userRole.country === EExtCountry.AUSTRALIA;

    if (hasFaceToFaceSetting && isProfessionalInterpreterFromAustralia) {
      const { backyCheck } = userRole;
      const isWWCCValid =
        backyCheck &&
        (backyCheck.checkStatus === EExtCheckStatus.READY ||
          backyCheck.checkResults === EExtCheckResult.CLEAR ||
          backyCheck.manualCheckResults === EManualCheckResult.MANUAL_APPROVED);

      if (!isWWCCValid) {
        throw new BadRequestException("Upload your WWCC to be able to get face-to-face appointments.");
      }
    }
  }
}
