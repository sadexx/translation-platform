import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateAppointmentDto } from "src/modules/appointments/common/dto";

export function IsValidSchedulingExtraDays(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidSchedulingExtraDays",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string[], args: ValidationArguments) {
          const maxSchedulingExtraDays = 15;
          const relatedValue = (args.object as CreateAppointmentDto).schedulingExtraDay;

          if (relatedValue === false && value !== undefined && value.length >= 0) {
            return false;
          }

          if (relatedValue === true) {
            return Array.isArray(value) && value.length >= 1 && value.length <= maxSchedulingExtraDays;
          }

          return value === undefined || value.length === 0;
        },
        defaultMessage() {
          return "schedulingExtraDays must be present and contain 1 to 15 valid objects when schedulingExtraDay is true, and must be absent otherwise";
        },
      },
    });
  };
}
