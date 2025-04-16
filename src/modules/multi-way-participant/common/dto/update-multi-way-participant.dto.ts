import { IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

export class UpdateMultiWayParticipantDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,3}$/, { message: "Invalid phone code format" })
  phoneCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4,20}$/, { message: "Invalid phone number format" })
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
