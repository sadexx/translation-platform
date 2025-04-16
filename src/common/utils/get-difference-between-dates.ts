import { differenceInMinutes } from "date-fns";
import { NUMBER_OF_MINUTES_IN_HOUR } from "src/common/constants";

export function getDifferenceInHHMM(startDate: Date, endDate: Date): string {
  const COUNT_OF_NUMBER_IN_HOURS = 2;
  const differenceMs = differenceInMinutes(endDate, startDate);

  const hours = Math.floor(differenceMs / NUMBER_OF_MINUTES_IN_HOUR);
  const minutes = Math.floor(differenceMs % NUMBER_OF_MINUTES_IN_HOUR);

  const formattedHours = String(hours).padStart(COUNT_OF_NUMBER_IN_HOURS, "0");
  const formattedMinutes = String(minutes).padStart(COUNT_OF_NUMBER_IN_HOURS, "0");

  return `${formattedHours}:${formattedMinutes}`;
}
