import { IsUUID, Length } from "class-validator";

export class DeleteByRoleIdRequestDto {
  @IsUUID()
  @Length(36, 36)
  userRoleId: string;
}
