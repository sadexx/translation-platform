import { IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

export class CreateDraftMultiWayParticipantDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @IsString()
  @Matches(/^\+\d{1,3}$/, { message: "Invalid phone code format" })
  phoneCode: string;

  @IsString()
  @Matches(/^\d{4,20}$/, { message: "Invalid phone number format" })
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
