import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUppercase,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { IsFutureDate } from "src/common/validators";
import { IsPromoCampaignDatesValid } from "src/modules/promo-campaigns/common/validators";

export class CreateCorporatePromoCampaignDto {
  @IsNotEmpty()
  @IsUUID()
  companyId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  @Length(10, 10)
  promoCode: string;

  @IsInt()
  @Min(1)
  @Max(100)
  discount: number;

  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  @IsPromoCampaignDatesValid()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  @IsPromoCampaignDatesValid()
  endDate?: Date;

  @IsNotEmpty()
  @IsBoolean()
  validateHolder: boolean;
}
