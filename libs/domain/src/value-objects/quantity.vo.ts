export class QuantityVO {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Quantity must be a positive finite number");
    }
    this.value = value;
  }
}
