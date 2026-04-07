import { Telegraf } from "telegraf";

export function createTelegramClient(token: string): Telegraf {
  return new Telegraf(token);
}
