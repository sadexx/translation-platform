import {
  IsEmail,
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class CreateInterpreterRecommendationDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  recommenderFullName: string;

  @IsPhoneNumber()
  recommenderPhoneNumber: string;

  @IsEmail()
  @IsLowercase()
  @MinLength(6)
  recommenderEmail: string;
}
