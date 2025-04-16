import { IsNotEmpty, IsOptional, IsString, IsUppercase, IsUUID, Length } from "class-validator";

export class PromoCampaignAssignmentDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  @Length(10, 10)
  promoCode: string;
}
