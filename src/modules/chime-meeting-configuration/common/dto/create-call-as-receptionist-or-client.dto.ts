import { IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

export class CreateCallAsReceptionistOrClientDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  toPhoneNumber: string;
}
