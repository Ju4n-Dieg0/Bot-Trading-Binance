export class Price {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Price must be a positive finite number");
    }
    this.value = value;
  }

  multiply(multiplier: number): Price {
    return new Price(this.value * multiplier);
  }
}

export type PriceVO = Price;
