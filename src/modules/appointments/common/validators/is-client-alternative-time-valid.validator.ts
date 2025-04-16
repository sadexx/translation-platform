import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { isBefore } from "date-fns";
import { EndAppointmentDto } from "src/modules/appointments/common/dto";

export function IsClientAlternativeTimeValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isClientAlternativeTimeValid",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as EndAppointmentDto;

          if (!dto.clientSignature) {
            return false;
          }

          if (dto.clientAlternativeScheduledStartTime || dto.clientAlternativeScheduledEndTime) {
            if (dto.interpreterAlternativeScheduledStartTime || dto.adminAlternativeScheduledStartTime) {
              return false;
            }

            if (!dto.clientAlternativeScheduledStartTime || !dto.clientAlternativeScheduledEndTime) {
              return false;
            }

            if (isBefore(dto.clientAlternativeScheduledEndTime, dto.clientAlternativeScheduledStartTime)) {
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
