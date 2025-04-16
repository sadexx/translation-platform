import { IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

export class AddPhoneNumber {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;
}
