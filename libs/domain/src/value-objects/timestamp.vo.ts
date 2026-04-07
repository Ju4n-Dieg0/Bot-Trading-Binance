export class TimestampVO {
  public readonly value: Date;

  constructor(value: Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid timestamp");
    }
    this.value = new Date(value.getTime());
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
