export interface EventBus {
  publish<T>(topic: string, payload: T): Promise<void>;
}

export * from "./postgres";
export * from "./redis";
