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
const paperPositionBySymbol = new Map<string, { quantity: number; averageEntryPrice: number }>();
let paperBalance = 0;
let realizedPnl = 0;
let openPositionsCount = 0;

function pushRecentSignal(signal: TradeSignal): void {
  recentSignals.unshift(signal);
  if (recentSignals.length > 10) {
    recentSignals.pop();
  }
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function getPaperPosition(symbol: string): { quantity: number; averageEntryPrice: number } {
  const current = paperPositionBySymbol.get(symbol);
  if (current) {
    return current;
  }

  const initial = { quantity: 0, averageEntryPrice: 0 };
  paperPositionBySymbol.set(symbol, initial);
  return initial;
}

function updatePaperPortfolio(payload: {
  symbol: string;
  action: "buy" | "sell" | "hold";
  executedPrice?: number | null;
  executedQty?: number | null;
  tradingMode: "paper" | "real";
}): string | null {
  if (payload.tradingMode !== "paper") {
    return null;
  }

  const executedPrice = payload.executedPrice ?? 0;
  const executedQty = payload.executedQty ?? 0;
  if (executedPrice <= 0 || executedQty <= 0) {
    return null;
  }

  const position = getPaperPosition(payload.symbol);

  if (payload.action === "buy") {
    const previousCost = position.quantity * position.averageEntryPrice;
    const newCost = executedQty * executedPrice;
    const newQuantity = position.quantity + executedQty;

    position.quantity = newQuantity;
    position.averageEntryPrice = newQuantity > 0 ? (previousCost + newCost) / newQuantity : 0;
    paperBalance -= newCost;
    return null;
  }

  if (payload.action === "sell") {
    const sellQuantity = Math.min(position.quantity, executedQty);
    const pnl = (executedPrice - position.averageEntryPrice) * sellQuantity;
    realizedPnl += pnl;
    paperBalance += executedPrice * sellQuantity;
    position.quantity = Math.max(0, position.quantity - sellQuantity);

    if (position.quantity === 0) {
      position.averageEntryPrice = 0;
    }

    return `\nPnL realizado: ${formatAmount(pnl)} USDT`;
  }

  return null;
}

function buildBalanceSummary(symbol: string): string {
  const position = getPaperPosition(symbol);
  return [
    `Balance estimado: ${formatAmount(paperBalance)} USDT`,
    `PnL realizado: ${formatAmount(realizedPnl)} USDT`,
    `Posicion ${symbol}: ${position.quantity.toFixed(6)} (${formatAmount(position.averageEntryPrice)} USDT avg)`
  ].join("\n");
}

function resolveTargetChatId(env: ReturnType<typeof getEnv>): string | undefined {
  return env.TELEGRAM_DEFAULT_CHAT_ID || activeChats.values().next().value;
}

async function safeAnswerCallbackQuery(ctx: { answerCbQuery: (text?: string) => Promise<unknown> }, text: string): Promise<void> {
  try {
    await ctx.answerCbQuery(text);
  } catch (error: unknown) {
    console.error("telegram-bot answerCbQuery error", error);
  }
}

async function bootstrap(): Promise<void> {
  const env = getEnv();
  paperBalance = env.PAPER_INITIAL_BALANCE;

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to start telegram-bot");
  }

  const bot = createTelegramClient(env.TELEGRAM_BOT_TOKEN);
  registerStartCommand(bot);

  bot.catch((error: unknown) => {
    console.error("telegram-bot unhandled error", error);
  });

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
    const symbol = env.TRADING_SYMBOL;
    await ctx.reply([
      `Modo: ${env.TRADING_MODE}`,
      buildBalanceSummary(symbol)
    ].join("\n"));
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

  await subscriber.subscribe("signal_generated", "execution.completed", "order_executed");

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

      if (channel === "order_executed") {
        const payload = JSON.parse(message) as {
          signalId: string;
          symbol: string;
          action: "buy" | "sell" | "hold";
          status: "executed" | "rejected";
          orderId: string | null;
          executedPrice: number | null;
          executedQty: number | null;
          tradingMode: "paper" | "real";
          reason: string;
          errorMessage?: string | null;
          createdAt: string;
        };

        const chatId = resolveTargetChatId(env);
        if (!chatId) {
          return;
        }

        if (payload.status !== "executed") {
          const errorLabel = payload.reason === "insufficient-funds"
            ? "Fondos insuficientes"
            : payload.reason === "binance-api-error"
              ? "Error de Binance"
              : "Error interno";

          await bot.telegram.sendMessage(
            chatId,
            [
              `${payload.action.toUpperCase()} rechazado en ${payload.symbol}`,
              `Motivo: ${errorLabel}`,
              payload.errorMessage ? `Detalle: ${payload.errorMessage}` : "",
              payload.tradingMode === "paper"
                ? `Modo paper: sin cambio de balance.`
                : `Modo real: revisar saldo, red y permisos de la API.`
            ]
              .filter(Boolean)
              .join("\n")
          );
          return;
        }

        const balanceNote = updatePaperPortfolio(payload);

        const summary = payload.tradingMode === "paper"
          ? buildBalanceSummary(payload.symbol)
          : `Modo real: operacion ejecutada en Binance. Balance de cuenta no consultado por este bot.`;

        await bot.telegram.sendMessage(
          chatId,
          [
            `${payload.action.toUpperCase()} ejecutado en ${payload.symbol}`,
            `Precio: ${payload.executedPrice?.toFixed(2) ?? "n/a"}`,
            `Cantidad: ${payload.executedQty?.toFixed(6) ?? "n/a"}`,
            summary,
            balanceNote ? balanceNote.trim() : ""
          ]
            .filter(Boolean)
            .join("\n")
        );
        return;
      }

      const signal = JSON.parse(message) as TradeSignal;
      pushRecentSignal(signal);
      pendingSignals.set(signal.signalId, signal);

      const chatId = resolveTargetChatId(env);
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
      await safeAnswerCallbackQuery(ctx, "Signal expirada o no encontrada");
      return;
    }

    const approved = action === "confirm";

    if (approved) {
      const payload = JSON.stringify({
        signalId: signal.signalId,
        approved: true,
        symbol: signal.symbol,
        action: signal.action,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        createdAt: new Date().toISOString()
      });

      await publisher.publish("trade_confirmed", payload);
      await publisher.publish("trade.confirmed", payload);
    }

    pendingSignals.delete(signalId);
    await safeAnswerCallbackQuery(ctx, approved ? "Operacion confirmada" : "Operacion rechazada");
  });

  await bot.launch();
}

void bootstrap();
