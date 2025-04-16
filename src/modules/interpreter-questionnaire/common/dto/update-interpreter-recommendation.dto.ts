import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUUID } from "class-validator";

export class UpdateInterpreterRecommendationDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recommenderFullName?: string;

  @IsOptional()
  @IsPhoneNumber()
  recommenderPhoneNumber?: string;

  @IsOptional()
  @IsEmail()
  recommenderEmail?: string;
}
