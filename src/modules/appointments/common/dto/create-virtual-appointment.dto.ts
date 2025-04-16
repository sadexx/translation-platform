import { Type } from "class-transformer";
import { IsBoolean, IsIn, ValidateNested } from "class-validator";
import { EAppointmentCommunicationType, EAppointmentInterpretingType } from "src/modules/appointments/common/enums";
import { CreateAppointmentDto, CreateExtraDayVirtualDto } from "src/modules/appointments/common/dto";
import {
  IsValidAlternativePlatform,
  IsValidScheduledStartTimeVirtual,
  IsValidSchedulingExtraDays,
} from "src/modules/appointments/common/validators";
import { IsAlternativePlatformValid, IsExtraDaysGapValid } from "src/modules/appointments-shared/common/validators";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments-shared/common/constants";

export class CreateVirtualAppointmentDto extends CreateAppointmentDto {
  @IsIn(AUDIO_VIDEO_COMMUNICATION_TYPES, {
    message: "communicationType must be audio or video",
  })
  @IsValidScheduledStartTimeVirtual()
  communicationType: EAppointmentCommunicationType;

  @IsIn([EAppointmentInterpretingType.CONSECUTIVE, EAppointmentInterpretingType.SIGN_LANGUAGE])
  interpretingType: EAppointmentInterpretingType;

  @IsBoolean()
  @IsAlternativePlatformValid()
  alternativePlatform: boolean;

  @IsValidAlternativePlatform()
  alternativeVideoConferencingPlatformLink?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateExtraDayVirtualDto)
  @IsValidSchedulingExtraDays()
  @IsExtraDaysGapValid()
  schedulingExtraDays?: CreateExtraDayVirtualDto[];
}
