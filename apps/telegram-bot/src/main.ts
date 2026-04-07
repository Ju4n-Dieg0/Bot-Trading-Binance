import { getEnv } from "@libs/config";
import Redis from "ioredis";
import { Markup } from "telegraf";
import { type TradeSignal } from "@libs/shared";
import { createTelegramClient } from "./infrastructure/telegram/telegram-client";
import { registerStartCommand } from "./presentation/commands/start.command";

const pendingSignals = new Map<string, TradeSignal>();
const activeChats = new Set<string>();
const autoModeByChat = new Map<string, boolean>();
const recentSignals: TradeSignal[] = [];
let openPositionsCount = 0;

function pushRecentSignal(signal: TradeSignal): void {
  recentSignals.unshift(signal);
  if (recentSignals.length > 10) {
    recentSignals.pop();
  }
}

async function bootstrap(): Promise<void> {
  const env = getEnv();

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to start telegram-bot");
  }

  const bot = createTelegramClient(env.TELEGRAM_BOT_TOKEN);
  registerStartCommand(bot);

  bot.on("message", async (ctx, next) => {
    const chatId = String(ctx.chat.id);
    activeChats.add(chatId);
    if (!autoModeByChat.has(chatId)) {
      autoModeByChat.set(chatId, false);
    }
    await next();
  });

  bot.command("status", async (ctx) => {
    const chatId = String(ctx.chat.id);
    await ctx.reply(
      [
        `Modo trading: ${env.TRADING_MODE}`,
        `Auto trading: ${autoModeByChat.get(chatId) ? "ON" : "OFF"}`,
        `Signals pendientes: ${pendingSignals.size}`,
        `Posiciones abiertas: ${openPositionsCount}`
      ].join("\n")
    );
  });

  bot.command("signals", async (ctx) => {
    if (recentSignals.length === 0) {
      await ctx.reply("No hay senales recientes.");
      return;
    }

    const body = recentSignals
      .slice(0, 5)
      .map(
        (signal) =>
          `${signal.action.toUpperCase()} ${signal.symbol} | p=${signal.probabilityUp.toFixed(4)} | SL=${signal.stopLoss} TP=${signal.takeProfit}`
      )
      .join("\n");

    await ctx.reply(`Ultimas senales:\n${body}`);
  });

  bot.command("positions", async (ctx) => {
    await ctx.reply(`Posiciones abiertas estimadas: ${openPositionsCount}`);
  });

  bot.command("balance", async (ctx) => {
    const mode = env.TRADING_MODE === "paper" ? "paper" : "live";
    await ctx.reply(`Balance (${mode}): no disponible en bootstrap inicial.`);
  });

  bot.command("risk", async (ctx) => {
    await ctx.reply(
      [
        `MAX_RISK_PER_TRADE: ${env.MAX_RISK_PER_TRADE}%`,
        `MAX_OPEN_POSITIONS: ${env.MAX_OPEN_POSITIONS}`,
        `DEFAULT_STOP_LOSS_PCT: ${env.DEFAULT_STOP_LOSS_PCT}%`,
        `DEFAULT_TAKE_PROFIT_PCT: ${env.DEFAULT_TAKE_PROFIT_PCT}%`
      ].join("\n")
    );
  });

  bot.command("auto_on", async (ctx) => {
    autoModeByChat.set(String(ctx.chat.id), true);
    await ctx.reply("Auto trading activado.");
  });

  bot.command("auto_off", async (ctx) => {
    autoModeByChat.set(String(ctx.chat.id), false);
    await ctx.reply("Auto trading desactivado.");
  });

  const subscriber = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined
  });
  const publisher = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined
  });

  await subscriber.subscribe("signal_generated", "execution.completed");

  subscriber.on("message", async (channel, message) => {
    try {
      if (channel === "execution.completed") {
        const payload = JSON.parse(message) as { action: "buy" | "sell" | "hold"; status: string };
        if (payload.status === "executed" && payload.action === "buy") {
          openPositionsCount += 1;
        } else if (payload.status === "executed" && payload.action === "sell") {
          openPositionsCount = Math.max(0, openPositionsCount - 1);
        }
        return;
      }

      const signal = JSON.parse(message) as TradeSignal;
      pushRecentSignal(signal);
      pendingSignals.set(signal.signalId, signal);

      const chatId = env.TELEGRAM_DEFAULT_CHAT_ID || activeChats.values().next().value;
      if (!chatId) {
        return;
      }

      await bot.telegram.sendMessage(
        chatId,
        [
          `Signal: ${signal.action.toUpperCase()} ${signal.symbol}`,
          `ProbUp: ${signal.probabilityUp.toFixed(4)}`,
          `SL: ${signal.stopLoss}`,
          `TP: ${signal.takeProfit}`,
          "Confirmar ejecucion?"
        ].join("\n"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Aceptar", `confirm:${signal.signalId}`),
            Markup.button.callback("Rechazar", `reject:${signal.signalId}`)
          ]
        ])
      );
    } catch (error: unknown) {
      console.error("telegram-bot signal message error", error);
    }
  });

  bot.action(/^(confirm|reject):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const signalId = ctx.match[2];
    const signal = pendingSignals.get(signalId);

    if (!signal) {
      await ctx.answerCbQuery("Signal expirada o no encontrada");
      return;
    }

    const approved = action === "confirm";

    if (approved) {
      const payload = JSON.stringify({
        signalId: signal.signalId,
        approved: true,
        symbol: signal.symbol,
        action: signal.action,
        createdAt: new Date().toISOString()
      });

      await publisher.publish("trade_confirmed", payload);
      await publisher.publish("trade.confirmed", payload);
    }

    pendingSignals.delete(signalId);
    await ctx.answerCbQuery(approved ? "Operacion confirmada" : "Operacion rechazada");
  });

  await bot.launch();
}

void bootstrap();
