import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";

export function IsValidDraftExtraDays(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidDraftExtraDays",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string[], args: ValidationArguments) {
          const maxSchedulingExtraDays = 15;
          const relatedValue = (args.object as CreateDraftAppointmentsDto).schedulingExtraDay;

          if (relatedValue === false && value !== undefined && value.length >= 0) {
            return false;
          }

          if (relatedValue === true) {
            return Array.isArray(value) && value.length >= 1 && value.length <= maxSchedulingExtraDays;
          }

          return value === undefined || value.length === 0;
        },
        defaultMessage() {
          return "draftExtraDays must be present and contain 1 to 15 valid objects when schedulingExtraDay is true, and must be absent otherwise";
        },
      },
    });
  };
}
