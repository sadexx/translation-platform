import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { EAppointmentParticipantType } from "src/modules/appointments/common/enums";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";

export function IsCorrectMultiWayParticipant(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isCorrectMultiWayParticipant",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string[] | undefined, args: ValidationArguments) {
          const relatedValue = (args.object as CreateDraftAppointmentsDto).participantType;

          if (relatedValue === EAppointmentParticipantType.MULTI_WAY) {
            return Array.isArray(value) && value.length > 0;
          }

          return value === undefined;
        },
        defaultMessage() {
          return "Participants should be present if participantType is multi-way, or absent otherwise";
        },
      },
    });
  };
}
