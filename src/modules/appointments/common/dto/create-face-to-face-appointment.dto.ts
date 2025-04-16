import { Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, ValidateNested } from "class-validator";
import { CreateFaceToFaceAppointmentAddressDto } from "src/modules/addresses/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSimultaneousInterpretingType,
} from "src/modules/appointments/common/enums";
import { CreateAppointmentDto, CreateExtraDayFaceToFaceDto } from "src/modules/appointments/common/dto";
import {
  IsAlternativePlatformNotAllowed,
  IsValidScheduledStartTimeFaceToFace,
  IsValidSchedulingExtraDays,
} from "src/modules/appointments/common/validators";
import { IsExtraDaysGapValid, IsSimultaneousTypeValid } from "src/modules/appointments-shared/common/validators";

export class CreateFaceToFaceAppointmentDto extends CreateAppointmentDto {
  @IsIn([EAppointmentCommunicationType.FACE_TO_FACE], {
    message: "communicationType must be face-to-face",
  })
  @IsValidScheduledStartTimeFaceToFace()
  communicationType: EAppointmentCommunicationType;

  @IsEnum(EAppointmentInterpretingType)
  interpretingType: EAppointmentInterpretingType;

  @IsSimultaneousTypeValid()
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateFaceToFaceAppointmentAddressDto)
  address: CreateFaceToFaceAppointmentAddressDto;

  @ValidateNested({ each: true })
  @Type(() => CreateExtraDayFaceToFaceDto)
  @IsValidSchedulingExtraDays()
  @IsExtraDaysGapValid()
  schedulingExtraDays?: CreateExtraDayFaceToFaceDto[];

  @IsAlternativePlatformNotAllowed()
  alternativePlatform: boolean = false;

  @IsAlternativePlatformNotAllowed()
  alternativeVideoConferencingPlatformLink: string;
}
