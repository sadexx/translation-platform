import { IsNumber, Min } from "class-validator";

export class UpdateMembershipPriceDto {
  @IsNumber()
  @Min(1)
  price: number;
}
