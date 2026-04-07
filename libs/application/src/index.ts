import { TradeSignal } from "@libs/domain";

export interface GenerateSignalUseCase {
  execute(symbol: string): Promise<TradeSignal>;
}
