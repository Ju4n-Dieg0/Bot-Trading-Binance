export class Symbol {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(normalized)) {
      throw new Error("Invalid trading symbol format");
    }
    this.value = normalized;
  }

  equals(other: Symbol): boolean {
    return this.value === other.value;
  }
}

export type SymbolVO = Symbol;
