import { IsBoolean, IsEmail, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";
import { EUserGender, EUserTitle } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreter-profile/common/enum";

export class UpdateUserProfileInformationDto {
  @IsOptional()
  @IsEnum(EUserTitle)
  title?: EUserTitle;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  middleName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(EUserGender)
  gender?: EUserGender;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsEnum(ELanguages)
  nativeLanguage?: ELanguages;

  @IsOptional()
  @IsBoolean()
  isIdentifyAsAboriginalOrTorresStraitIslander?: boolean;
}
