import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { isAfter } from "date-fns";
import { CreatePersonalPromoCampaignDto } from "src/modules/promo-campaigns/common/dto";

export function IsPromoCampaignDatesValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isPromoCampaignDatesValid",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const { startDate, endDate } = args.object as CreatePersonalPromoCampaignDto;

          if ((startDate && endDate) || (!startDate && !endDate)) {
            if (startDate && endDate) {
              return isAfter(endDate, startDate);
            }

            return true;
          }

          return false;
        },
        defaultMessage(args: ValidationArguments) {
          const { startDate, endDate } = args.object as CreatePersonalPromoCampaignDto;

          if (!startDate || !endDate) {
            return "Both startDate and endDate must either be present or absent.";
          }

          return "endDate must be greater than startDate.";
        },
      },
    });
  };
}
