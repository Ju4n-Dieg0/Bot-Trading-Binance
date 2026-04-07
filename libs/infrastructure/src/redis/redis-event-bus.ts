import Redis, { type RedisOptions } from "ioredis";
import { type RedisEventPayloadMap, type RedisEventTopic } from "./event-topics";

export type RedisEventHandler<TTopic extends RedisEventTopic> = (
  payload: RedisEventPayloadMap[TTopic]
) => Promise<void> | void;

export class RedisEventBus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(options: RedisOptions) {
    this.publisher = new Redis(options);
    this.subscriber = new Redis(options);
  }

  async publish<TTopic extends RedisEventTopic>(
    topic: TTopic,
    payload: RedisEventPayloadMap[TTopic]
  ): Promise<void> {
    await this.publisher.publish(topic, JSON.stringify(payload));
  }

  async subscribe<TTopic extends RedisEventTopic>(
    topic: TTopic,
    handler: RedisEventHandler<TTopic>
  ): Promise<void> {
    await this.subscriber.subscribe(topic);
    this.subscriber.on("message", (channel, rawMessage) => {
      if (channel !== topic) {
        return;
      }

      const payload = JSON.parse(rawMessage) as RedisEventPayloadMap[TTopic];
      void handler(payload);
    });
  }

  async close(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
