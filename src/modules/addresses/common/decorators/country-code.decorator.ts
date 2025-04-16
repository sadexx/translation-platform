import { Transform } from "class-transformer";
import { countryCodeMap } from "src/modules/addresses/common/enums";

const ISO_COUNTRY_CODE_LENGTH = 2;

export const CountryCodeTransformer = (): PropertyDecorator =>
  Transform(({ value }: { value: string }) => {
    if (value.length === ISO_COUNTRY_CODE_LENGTH) {
      const country = countryCodeMap[value.toUpperCase()];

      return country;
    }

    return value;
  });
