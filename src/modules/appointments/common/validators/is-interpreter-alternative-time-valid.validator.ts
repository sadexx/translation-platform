import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { isBefore } from "date-fns";
import { EndAppointmentDto } from "src/modules/appointments/common/dto";

export function IsInterpreterAlternativeTimeValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isInterpreterAlternativeTimeValid",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as EndAppointmentDto;

          if (!dto.interpreterSignature) {
            return false;
          }

          if (dto.interpreterAlternativeScheduledStartTime || dto.interpreterAlternativeScheduledEndTime) {
            if (dto.clientAlternativeScheduledStartTime || dto.adminAlternativeScheduledStartTime) {
              return false;
            }

            if (!dto.interpreterAlternativeScheduledStartTime || !dto.interpreterAlternativeScheduledEndTime) {
              return false;
            }

            if (isBefore(dto.interpreterAlternativeScheduledEndTime, dto.interpreterAlternativeScheduledStartTime)) {
              return false;
            }
          }

          return true;
        },
        defaultMessage() {
          return "Only one set of valid alternative times with a corresponding signature should be provided in a single request.";
        },
      },
    });
  };
}
