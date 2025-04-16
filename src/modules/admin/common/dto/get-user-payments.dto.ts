import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { EPaymentMethod, EPaymentStatus, EReceiptType } from "src/modules/payments/common/enums";
import { ESortOrder } from "src/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";

export class GetUserPaymentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsEnum(EReceiptType)
  receiptType?: EReceiptType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPaymentStatus, { each: true })
  statuses?: EPaymentStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPaymentMethod, { each: true })
  paymentMethod?: EPaymentMethod;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsEnum(ESortOrder)
  invoiceNumberOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  amountOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  appointmentDateOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  dueDateOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  statusOrder?: ESortOrder;
}
