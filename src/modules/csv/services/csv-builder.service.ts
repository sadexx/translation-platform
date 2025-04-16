import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment } from "src/modules/appointments/entities";
import {
  IAppointmentsCsv,
  ICompaniesCsv,
  IDraftAppointmentsCsv,
  IEmployeesCsv,
  IUsersCsv,
} from "src/modules/csv/common/interfaces/csv-data";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ADMIN_ROLES, CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import { User } from "src/modules/users/entities";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { Company } from "src/modules/companies/entities";
import { CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES } from "src/modules/companies/common/constants/constants";
import { UserRole } from "src/modules/users-roles/entities";
import { HelperService } from "src/modules/helper/services";
import {
  GetCsvAppointmentsDto,
  GetCsvCompaniesDto,
  GetCsvDraftAppointmentsDto,
  GetCsvEmployeesDto,
  GetCsvUsersDto,
} from "src/modules/csv/common/dto";
import { CsvQueryService } from "src/modules/csv/services";
import { ContactForm } from "src/modules/contact-form/entities";
import { IContactFormsCsv } from "../common/interfaces/csv-data/contact-forms-csv.interface";

@Injectable()
export class CsvBuilderService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(DraftAppointment)
    private readonly draftAppointmentRepository: Repository<DraftAppointment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(ContactForm)
    private readonly contactFormRepository: Repository<ContactForm>,
    private readonly csvQueryService: CsvQueryService,
    private readonly helperService: HelperService,
  ) {}

  public async getAppointmentsCsvData(
    user: ITokenUserData,
    dto: GetCsvAppointmentsDto,
    isArchived: boolean,
    offset: number,
    limit: number,
  ): Promise<IAppointmentsCsv[]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");

    if (CLIENT_ROLES.includes(user.role)) {
      this.csvQueryService.getCsvAppointmentsForClientOptions(queryBuilder, user, isArchived, dto, offset, limit);
    }

    if (INTERPRETER_ROLES.includes(user.role)) {
      this.csvQueryService.getCsvAppointmentsForInterpreterOptions(queryBuilder, user, isArchived, dto, offset, limit);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      const adminUserRole = await this.helperService.getUserRoleById(user.userRoleId, { role: true });
      this.csvQueryService.getCsvAppointmentsForAdminOptions(queryBuilder, dto, adminUserRole, offset, limit);
    }

    const appointments = await queryBuilder.getMany();

    return appointments.map((appointment) => this.buildAppointmentCsvData(appointment));
  }

  private buildAppointmentCsvData(appointment: Appointment): IAppointmentsCsv {
    const { interpreter, client } = appointment;
    const interpreterFullName = interpreter
      ? `${interpreter?.profile.firstName} ${interpreter?.profile.lastName}`
      : null;
    const clientFullName = `${client?.profile.firstName} ${client?.profile.lastName}`;

    return {
      platformId: appointment.platformId,
      status: appointment.status,
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      scheduledStartTime: appointment.scheduledStartTime,
      scheduledEndTime: appointment.scheduledEndTime,
      schedulingDurationMin: appointment.schedulingDurationMin,
      interpreterFullName: interpreterFullName,
      interpreterRole: interpreter?.role.name ?? null,
      clientFullName: clientFullName,
      languageFrom: appointment.languageFrom,
      languageTo: appointment.languageTo,
      topic: appointment.topic,
      creationDate: appointment.creationDate,
      paidByClient: appointment.paidByClient ?? null,
      clientCurrency: appointment.clientCurrency ?? null,
      receivedByInterpreter: appointment.receivedByInterpreter ?? null,
      interpreterCurrency: appointment.interpreterCurrency ?? null,
      appointmentCallRating: appointment.appointmentRating?.appointmentCallRating ?? null,
      interpreterRating: appointment.appointmentRating?.interpreterRating ?? null,
      promoCampaignDiscount: appointment.discountAssociation?.promoCampaignDiscount ?? null,
      membershipDiscount: appointment.discountAssociation?.membershipDiscount ?? null,
      promoCampaignDiscountMinutes: appointment.discountAssociation?.promoCampaignDiscountMinutes ?? null,
      membershipFreeMinutes: appointment.discountAssociation?.membershipFreeMinutes ?? null,
      promoCode: appointment.discountAssociation?.promoCode ?? null,
      membershipType: appointment.discountAssociation?.membershipType ?? null,
    };
  }

  public async getDraftAppointmentsCsvData(
    user: ITokenUserData,
    dto: GetCsvDraftAppointmentsDto,
    offset: number,
    limit: number,
  ): Promise<IDraftAppointmentsCsv[]> {
    let draftAppointments: DraftAppointment[] = [];

    if (CLIENT_ROLES.includes(user.role)) {
      const queryOptions = this.csvQueryService.getCsvDraftAppointmentsForClientOptions(user.userRoleId, offset, limit);
      draftAppointments = await this.draftAppointmentRepository.find(queryOptions);
    }

    if (ADMIN_ROLES.includes(user.role)) {
      const queryBuilder = this.draftAppointmentRepository.createQueryBuilder("draftAppointment");
      this.csvQueryService.getCsvDraftAppointmentsForAdminOptions(queryBuilder, dto, offset, limit);
      draftAppointments = await queryBuilder.getMany();
    }

    return draftAppointments.map((draftAppointment) => this.buildDraftAppointmentCsvData(draftAppointment));
  }

  private buildDraftAppointmentCsvData(draftAppointment: DraftAppointment): IDraftAppointmentsCsv {
    const { client } = draftAppointment;
    const clientFullName = `${client?.profile.firstName} ${client?.profile.lastName}`;

    return {
      platformId: draftAppointment.platformId,
      status: draftAppointment.status,
      interpreterType: draftAppointment.interpreterType,
      schedulingType: draftAppointment.schedulingType,
      communicationType: draftAppointment.communicationType,
      scheduledStartTime: draftAppointment.scheduledStartTime,
      schedulingDurationMin: draftAppointment.schedulingDurationMin,
      clientFullName: clientFullName,
      languageFrom: draftAppointment.languageFrom,
      languageTo: draftAppointment.languageTo,
      topic: draftAppointment.topic,
      creationDate: draftAppointment.creationDate,
    };
  }

  public async getUsersCsvData(dto: GetCsvUsersDto, offset: number, limit: number): Promise<IUsersCsv[]> {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    this.csvQueryService.getCsvUsersOptions(queryBuilder, dto, offset, limit);

    const users = await queryBuilder.getMany();

    return users.map((user) => this.buildUserCsvData(user));
  }

  private buildUserCsvData(user: User): IUsersCsv {
    const { profile, address, role, interpreterProfile } = user.userRoles[0];
    const fullName = profile ? `${profile.firstName} ${profile.lastName}` : null;
    const knownLanguages = interpreterProfile ? interpreterProfile?.knownLanguages : null;
    const gender = profile ? profile.gender : null;
    const country = address ? address.country : null;
    const state = address ? address.state : null;
    const suburb = address ? address.suburb : null;

    return {
      fullName,
      accountStatus: user.userRoles[0].accountStatus,
      role: role.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      gender,
      knownLanguages,
      country,
      state,
      city: suburb,
    };
  }

  public async getCompaniesCsvData(
    user: ITokenUserData,
    dto: GetCsvCompaniesDto,
    offset: number,
    limit: number,
  ): Promise<ICompaniesCsv[]> {
    const queryBuilder = this.companyRepository.createQueryBuilder("company");
    this.csvQueryService.getCsvCompaniesOptions(queryBuilder, dto, offset, limit);

    if (CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const personalUserRole = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!personalUserRole) {
        throw new BadRequestException("Operator company admin not exist!");
      }

      queryBuilder.andWhere("company.operatedBy = :operatedBy", {
        operatedBy: personalUserRole.operatedByCompanyId,
      });
    }

    const companies = await queryBuilder.getMany();

    return companies.map((company) => this.buildCompanyCsvData(company));
  }

  private buildCompanyCsvData(company: Company): ICompaniesCsv {
    return {
      name: company.name,
      status: company.status,
      country: company.country,
      platformId: company.platformId,
      phoneNumber: company.phoneNumber,
      contactEmail: company.contactEmail,
      activitySphere: company.activitySphere ?? null,
      employeesNumber: company.employeesNumber,
    };
  }

  public async getEmployeesCsvData(
    user: ITokenUserData,
    dto: GetCsvEmployeesDto,
    offset: number,
    limit: number,
  ): Promise<IEmployeesCsv[]> {
    const company = await this.helperService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const queryBuilder = this.userRoleRepository
      .createQueryBuilder("userRole")
      .where("userRole.operatedByCompanyId = :companyId", { companyId: company.id });
    this.csvQueryService.getCsvEmployeesOptions(queryBuilder, dto, offset, limit);

    const employees = await queryBuilder.getMany();

    return employees.map((employee) => this.buildEmployeeCsvData(employee));
  }

  private buildEmployeeCsvData(employee: UserRole): IEmployeesCsv {
    const { profile, address, role, user } = employee;
    const fullName = `${profile.firstName} ${profile.lastName}`;

    return {
      fullName,
      accountStatus: employee.accountStatus,
      role: role.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      city: address.suburb,
    };
  }

  // TODO: remove after tests
  public async getContactFormTestData(offset: number, limit: number): Promise<IContactFormsCsv[]> {
    const contactForms = await this.contactFormRepository
      .createQueryBuilder("contactForm")
      .skip(offset)
      .take(limit)
      .getMany();

    return contactForms.map((contactForm) => this.buildContactFormTestCsvData(contactForm));
  }

  private buildContactFormTestCsvData(contactForm: ContactForm): IContactFormsCsv {
    return {
      name: contactForm.userName,
      email: contactForm.email,
      message: contactForm.message,
    };
  }
}
