export enum EUserGender {
  MALE = "m-(male)",
  FEMALE = "f-(female)",
  OTHER = "other",
}

export const userGenderOrder: Record<EUserGender, number> = {
  [EUserGender.MALE]: 1,
  [EUserGender.FEMALE]: 2,
  [EUserGender.OTHER]: 3,
};
