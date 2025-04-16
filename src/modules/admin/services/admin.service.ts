import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users-roles/entities";
import {
  GetUserDocumentsDto,
  GetUserInterpreterProfileDto,
  GetUserPaymentsDto,
  GetUserProfileDto,
  GetUsersDto,
  GetUserStepsDto,
} from "src/modules/admin/common/dto";
import { AccountActivationService } from "src/modules/account-activation/services";
import { IAccountRequiredStepsData } from "src/modules/account-activation/common/interfaces";
import { InterpreterProfile } from "src/modules/interpreter-profile/entities";
import { COMPANY_PERSONAL_ROLES } from "src/modules/companies/common/constants/constants";
import { AdminQueryOptionsService } from "src/modules/admin/services";
import { GetUserDocumentsOutput, GetUserProfileOutput, GetUsersOutput } from "src/modules/admin/common/output";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { COMPANY_ADMIN_ROLES, DUE_PAYMENT_STATUSES } from "src/common/constants";
import { Payment } from "src/modules/payments/entities";
import { round2 } from "src/common/utils";
import { format } from "date-fns";
import { IGetUserPayment, IGetUserPaymentResponse } from "src/modules/admin/common/interfaces";
import { EReceiptType } from "src/modules/payments/common/enums";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly adminQueryOptionsService: AdminQueryOptionsService,
    private readonly accountActivationService: AccountActivationService,
  ) {}

  public async getUsers(dto: GetUsersDto): Promise<GetUsersOutput> {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    this.adminQueryOptionsService.getUsersOptions(queryBuilder, dto);

    const [users, count] = await queryBuilder.getManyAndCount();

    return { data: users, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getUserDocuments(dto: GetUserDocumentsDto): Promise<GetUserDocumentsOutput> {
    const queryOptions = this.adminQueryOptionsService.getUserDocumentsOptions(dto);
    const userDocs = await this.userRoleRepository.findOne(queryOptions);

    if (!userDocs) {
      throw new NotFoundException("User not found!");
    }

    return { documents: userDocs };
  }

  public async getUserProfile(dto: GetUserProfileDto): Promise<GetUserProfileOutput> {
    const queryOptions = this.adminQueryOptionsService.getUserProfileOptions(dto);
    const userProfile = await this.userRoleRepository.findOne(queryOptions);

    if (!userProfile) {
      throw new NotFoundException("User not found!");
    }

    return { profile: userProfile };
  }

  public async getUserSteps(dto: GetUserStepsDto, user: ITokenUserData): Promise<IAccountRequiredStepsData> {
    const { userRole, accountActivationSteps } =
      await this.accountActivationService.fetchUserAndEvaluateRequiredAndActivationSteps(dto.id, dto.userRole);

    if (COMPANY_PERSONAL_ROLES.includes(user.role)) {
      const personalAccount = await this.userRoleRepository.findOne({ where: { id: user.userRoleId } });

      if (!personalAccount) {
        throw new BadRequestException("Account of personal not found!");
      }

      if (personalAccount.operatedByCompanyId !== userRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    if (COMPANY_ADMIN_ROLES.includes(user.role)) {
      const admin = await this.userRoleRepository.findOne({
        where: { userId: user.id, role: { name: user.role } },
      });

      if (!admin || !admin.operatedByCompanyId) {
        throw new BadRequestException("Admin does not exist or company not set!");
      }

      if (userRole.operatedByCompanyId !== admin.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    return accountActivationSteps;
  }

  public async getUserInterpreterProfile(dto: GetUserInterpreterProfileDto): Promise<InterpreterProfile | null> {
    const interpreterProfile = await this.interpreterProfileRepository.findOne({
      where: { userRole: { userId: dto.id, role: { name: dto.userRole } } },
    });

    return interpreterProfile;
  }

  public async getUserPayments(dto: GetUserPaymentsDto): Promise<IGetUserPaymentResponse> {
    const queryBuilder = this.paymentRepository.createQueryBuilder("payment");
    this.adminQueryOptionsService.getUserPaymentsOptions(queryBuilder, dto);
    const [payments, totalCount] = await queryBuilder.getManyAndCount();

    const result: IGetUserPayment[] = [];

    for (const payment of payments) {
      let amount = payment.totalFullAmount;
      let appointmentDate: string | null = null;
      let dueDate: string | null = null;
      let invoiceNumber: string | undefined = payment?.appointment?.platformId;

      if (dto.receiptType && dto.receiptType === EReceiptType.TAX_INVOICE) {
        amount = payment.totalGstAmount;
      }

      if (payment.appointment?.scheduledStartTime) {
        appointmentDate = format(payment.appointment.scheduledStartTime, "dd MMM yyyy");
      }

      if (payment.items && payment.items.length > 0 && DUE_PAYMENT_STATUSES.includes(payment.items[0].status)) {
        dueDate = format(payment.items[0].updatingDate, "dd MMM yyyy");
      }

      if (payment.membershipId && payment.fromClient) {
        invoiceNumber = `${payment.fromClient.user.platformId}-${payment.platformId}`;
      }

      if (payment.isDepositCharge && payment.company) {
        invoiceNumber = `${payment.company.platformId}-${payment.platformId}`;
      }

      const firstItem = payment.items.sort(
        (a, b) => new Date(b.updatingDate).getTime() - new Date(a.updatingDate).getTime(),
      )[0];

      result.push({
        invoiceNumber,
        appointmentDate,
        dueDate,
        amount: `${round2(Number(amount))} ${payment.currency}`,
        status: firstItem?.status,
        paymentMethod: payment.paymentMethodInfo,
        internalReceiptKey: payment.receipt,
        taxInvoiceKey: payment.taxInvoice,
        note: payment.note,
        items: payment.items,
      });
    }

    return { data: result, total: totalCount, limit: dto.limit, offset: dto.offset };
  }
}
