import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from "class-validator";

export class CreateCallExternalParticipantsDto {
  @IsArray()
  @ArrayNotEmpty({ message: "inActiveAttendeeIds array must not be empty" })
  @IsUUID("all", { each: true, message: "Each inActiveAttendeeId must be a valid UUID" })
  @ArrayUnique()
  inActiveAttendeeIds: string[];
}
