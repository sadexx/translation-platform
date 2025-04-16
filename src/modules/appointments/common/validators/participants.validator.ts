import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { EAppointmentParticipantType } from "src/modules/appointments/common/enums";
import { CreateAppointmentDto } from "src/modules/appointments/common/dto";

export function IsAbsentIfNotMultiWay(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isAbsentIfNotMultiWay",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string[], args: ValidationArguments) {
          const relatedValue = (args.object as CreateAppointmentDto).participantType;

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
