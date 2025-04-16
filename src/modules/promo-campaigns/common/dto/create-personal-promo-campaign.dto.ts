import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUppercase,
  Length,
  Max,
  Min,
} from "class-validator";
import { IsFutureDate } from "src/common/validators";
import { EPromoCampaignCategory } from "src/modules/promo-campaigns/common/enums";
import { IsPromoCampaignDatesValid } from "src/modules/promo-campaigns/common/validators";

export class CreatePersonalPromoCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  @Length(10, 10)
  promoCode: string;

  @IsIn([EPromoCampaignCategory.PERSONAL, EPromoCampaignCategory.GENERAL])
  category: EPromoCampaignCategory;

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
}
