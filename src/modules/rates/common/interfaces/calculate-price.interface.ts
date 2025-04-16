export interface ICalculatePrice {
  price: number;
  priceByBlocks: IPriceByBlock[];
  addedDurationToLastBlockWhenRounding: number;
}

export interface IPriceByBlock {
  price: number;
  duration: number;
}
