export enum EPromoCampaignStatus {
  ACTIVE = "active",
  PAUSED = "paused",
}

export const promoCampaignStatusOrder: Record<EPromoCampaignStatus, number> = {
  [EPromoCampaignStatus.ACTIVE]: 1,
  [EPromoCampaignStatus.PAUSED]: 2,
};
