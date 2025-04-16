import { EEnvironment } from "src/common/enums";

/**
 ** In months
 */
export const NUMBER_OF_MONTHS_IN_HALF_YEAR: number = 6;
/**
 ** In days
 */
export const NUMBER_OF_DAYS_IN_SEVEN_YEARS: number = 2555;
export const NUMBER_OF_DAYS_IN_TWO_YEARS: number = 730;
export const NUMBER_OF_DAYS_IN_YEAR: number = 365;
export const NUMBER_OF_DAYS_IN_HALF_YEAR: number = 180;
export const NUMBER_OF_DAYS_IN_THREE_MONTH: number = 90;
export const NUMBER_OF_DAYS_IN_MONTH: number = 30;
export const NUMBER_OF_DAYS_IN_TEN_DAYS: number = 10;
export const NUMBER_OF_DAYS_IN_TWO_WEEKS: number = 14;
export const NUMBER_OF_DAYS_IN_WEEK: number = 7;
export const NUMBER_OF_DAYS_IN_WORK_WEEK: number = 5;
export const NUMBER_OF_DAYS_IN_THREE_DAYS: number = 3;
export const NUMBER_OF_DAYS_IN_TWO_DAYS: number = 2;
/**
 ** In hours
 */
export const NUMBER_OF_HOURS_IN_FIFTEEN_DAYS: number = 360;
export const NUMBER_OF_HOURS_IN_WEEK: number = 168;
export const NUMBER_OF_HOURS_IN_TWO_DAYS: number = 48;
export const NUMBER_OF_HOURS_IN_DAY_AND_HALF: number = 36;
export const NUMBER_OF_HOURS_IN_DAY: number = 24;
export const NUMBER_OF_HOURS_IN_THREE_QUARTERS_OF_DAY: number = 18;
export const NUMBER_OF_HOURS_IN_HALF_DAY: number = 12;
export const NUMBER_OF_HOURS_IN_TEN_HOURS: number = 10;
export const NUMBER_OF_HOURS_IN_QUARTER_DAY: number = 6;
export const NUMBER_OF_HOURS_IN_THREE_HOURS: number = 3;
export const NUMBER_OF_HOURS_IN_TWO_HOURS: number = 2;
export const NUMBER_OF_HOURS_IN_HOUR: number = 1;
/**
 ** In minutes
 */
export const NUMBER_OF_MINUTES_IN_FOUR_DAYS: number = 5760;
export const NUMBER_OF_MINUTES_IN_THREE_DAYS: number = 4320;
export const NUMBER_OF_MINUTES_IN_TWO_DAYS: number = 2880;
export const NUMBER_OF_MINUTES_IN_DAY: number = 1440;
export const NUMBER_OF_MINUTES_IN_TWELVE_HOURS: number = 720;
export const NUMBER_OF_MINUTES_IN_THREE_HOURS: number = 180;
export const NUMBER_OF_MINUTES_IN_TWO_HOURS: number = 120;
export const NUMBER_OF_MINUTES_IN_HOUR_AND_HALF: number = 90;
export const NUMBER_OF_MINUTES_IN_HOUR: number = 60;
export const NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR: number = 45;
export const NUMBER_OF_MINUTES_IN_HALF_HOUR: number = 30;
export const NUMBER_OF_MINUTES_IN_TWENTY_MINUTES: number = 20;
export const NUMBER_OF_MINUTES_IN_QUARTER_HOUR: number = 15;
export const NUMBER_OF_MINUTES_IN_TEN_MINUTES: number = 10;
export const NUMBER_OF_MINUTES_IN_FIVE_MINUTES: number = 5;
export const NUMBER_OF_MINUTES_IN_THREE_MINUTES: number = 3;
export const NUMBER_OF_SECONDS_IN_MINUTE: number = 60;
/**
 ** In seconds
 */
export const NUMBER_OF_SECONDS_IN_HOUR: number = 3600;
export const NUMBER_OF_SECONDS_IN_DAY =
  NUMBER_OF_SECONDS_IN_MINUTE * NUMBER_OF_MINUTES_IN_HOUR * NUMBER_OF_HOURS_IN_DAY;
export const NUMBER_OF_SECONDS_IN_YEAR = NUMBER_OF_SECONDS_IN_DAY * NUMBER_OF_DAYS_IN_YEAR;
/**
 ** In milliseconds
 */
export const NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS: number = 10000;
export const NUMBER_OF_MILLISECONDS_IN_FIVE_SECONDS: number = 5000;
export const NUMBER_OF_MILLISECONDS_IN_SECOND: number = 1000;
export const NUMBER_OF_MILLISECONDS_IN_MINUTE = NUMBER_OF_MILLISECONDS_IN_SECOND * NUMBER_OF_SECONDS_IN_MINUTE;
export const NUMBER_OF_MILLISECONDS_IN_HOUR =
  NUMBER_OF_MILLISECONDS_IN_SECOND * NUMBER_OF_SECONDS_IN_MINUTE * NUMBER_OF_MINUTES_IN_HOUR;
export const NUMBER_OF_MILLISECONDS_IN_DAY = NUMBER_OF_SECONDS_IN_DAY * NUMBER_OF_MILLISECONDS_IN_SECOND;
/**
 ** Other
 */
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ENVIRONMENT = process.env.NODE_ENV! as EEnvironment;
export const SEND_LOG_TO_LOKI: boolean = process.env.SEND_LOG_TO_LOKI === "true";
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const LOKI_URL: string = process.env.LOKI_URL!;
export const SMTP_SECURE_PORT: number = 465;
export const DEFAULT_EMPTY_VALUE: undefined = undefined;
export const JSON_INDENTATION_LEVEL: number = 2;
export const NUMBER_OF_PATH_PART_MODULE_INDEX: number = 2;
export const URL_EXPIRATION_MINUTES: number = 5;
export const URL_EXPIRATION_DAYS: number = 7;
export const NUMBER_BYTES_IN_KILOBYTE: number = 1024;
export const NUMBER_BYTES_IN_MEGABYTE = NUMBER_BYTES_IN_KILOBYTE * NUMBER_BYTES_IN_KILOBYTE;
export const LEGAL_AGE: number = 18;
export const API_PREFIX: string = "v1";
export const APP_INSTANCE_NAME = "appInstance";
export const DEFAULT_INTERPRETER_CANCELLATION_REASON =
  "Cancelled due to new appointment acceptance with ignoreConflicts.";
export const ONE_HUNDRED: number = 100;
export const GST_COEFFICIENT: number = 1.1;
export const TEN: number = 10;
export const TEN_PERCENT_MULTIPLIER: number = 0.1;
export const FIFTEEN_PERCENT_MULTIPLIER: number = 0.15;
