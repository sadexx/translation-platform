export function isSameDay(currentDate: Date, compareDate: Date): boolean {
  return (
    currentDate.getFullYear() === compareDate.getFullYear() &&
    currentDate.getMonth() === compareDate.getMonth() &&
    currentDate.getDate() === compareDate.getDate()
  );
}
