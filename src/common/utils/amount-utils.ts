const ONE_HUNDRED = 100;

export function denormalizedAmountToNormalized(denormalizedAmount: number): number {
  return Number((denormalizedAmount * ONE_HUNDRED).toFixed(0));
}

export function normalizedAmountToDenormalized(normalizedAmount: number): number {
  return normalizedAmount / ONE_HUNDRED;
}
