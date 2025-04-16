export function round2(value: number, fractionDigits: number = 2): number {
  return Number(value.toFixed(fractionDigits));
}
