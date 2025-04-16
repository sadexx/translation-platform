export enum ELanguageLevel {
  ZERO = "zero",
  ONE = "one",
  TWO = "two",
  THREE = "three",
  FOUR = "four",
}

export const languageLevelOrder: Record<ELanguageLevel, number> = {
  [ELanguageLevel.ZERO]: 1,
  [ELanguageLevel.ONE]: 2,
  [ELanguageLevel.TWO]: 3,
  [ELanguageLevel.THREE]: 4,
  [ELanguageLevel.FOUR]: 5,
};
