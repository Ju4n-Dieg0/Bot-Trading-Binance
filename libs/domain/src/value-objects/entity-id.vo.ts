export class EntityId {
  public readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("EntityId cannot be empty");
    }
    this.value = trimmed;
  }

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }
}
