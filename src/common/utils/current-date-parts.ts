export function getCurrentDateParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const currentDateNow = new Date();
  const ZERO_BASED_MONTH_OFFSET = 1;
  const year = currentDateNow.getUTCFullYear();
  const month = currentDateNow.getUTCMonth() + ZERO_BASED_MONTH_OFFSET;
  const day = currentDateNow.getUTCDate();
  const hour = currentDateNow.getUTCHours();
  const minute = currentDateNow.getUTCMinutes();

  return { year, month, day, hour, minute };
}
