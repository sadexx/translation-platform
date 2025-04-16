import { IsUUID, Length } from "class-validator";

export class AddInterpreterToOrderDto {
  @IsUUID()
  @Length(36, 36)
  interpreterRoleId: string;
}
