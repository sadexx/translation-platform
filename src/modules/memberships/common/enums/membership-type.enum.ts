export enum EMembershipType {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
}

export const membershipRanking: Record<EMembershipType, number> = {
  [EMembershipType.BRONZE]: 1,
  [EMembershipType.SILVER]: 2,
  [EMembershipType.GOLD]: 3,
};
