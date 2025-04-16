import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { PaginationQueryDto } from "src/common/dto";
import { ESortOrder } from "src/common/enums";
import { EPromoCampaignStatus, EPromoCampaignType } from "src/modules/promo-campaigns/common/enums";
import { CommaSeparatedToArray } from "src/common/decorators";

export class GetAllCorporatePromoCampaignsDto extends PaginationQueryDto {
  @IsEnum(EPromoCampaignType)
  type: EPromoCampaignType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;

  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(EPromoCampaignStatus, { each: true })
  statuses?: EPromoCampaignStatus[];

  @IsOptional()
  @CommaSeparatedToArray()
  @Min(1, { each: true })
  @Max(100, { each: true })
  discounts?: number[];

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsEnum(ESortOrder)
  statusOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  nameOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  promoCodeOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  discountOrder?: ESortOrder;

  @IsOptional()
  @IsEnum(ESortOrder)
  periodOrder?: ESortOrder;
}
