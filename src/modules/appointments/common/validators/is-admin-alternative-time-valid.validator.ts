import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { EndAppointmentDto } from "src/modules/appointments/common/dto";
import { isBefore } from "date-fns";

export function IsAdminAlternativeTimeValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isAdminAlternativeTimeValid",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as EndAppointmentDto;

          if (!dto.adminSignature) {
            return false;
          }

          if (dto.adminAlternativeScheduledStartTime || dto.adminAlternativeScheduledEndTime) {
            if (dto.clientAlternativeScheduledStartTime || dto.interpreterAlternativeScheduledStartTime) {
              return false;
            }

            if (!dto.adminAlternativeScheduledStartTime || !dto.adminAlternativeScheduledEndTime) {
              return false;
            }

            if (isBefore(dto.adminAlternativeScheduledEndTime, dto.adminAlternativeScheduledStartTime)) {
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
