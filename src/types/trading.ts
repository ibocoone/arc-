export enum OrderSide {
  LONG = "LONG",
  SHORT = "SHORT",
}

export enum OrderType {
  MARKET = "MARKET",
  LIMIT = "LIMIT",
  STOP_LIMIT = "STOP_LIMIT",
  TRAILING_STOP = "TRAILING_STOP",
}

export interface Market {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  category: "Crypto" | "Commodity" | "Forex" | "Stocks";
  fundingRate: number;
  borrowRate: number;
}

export interface Position {
  id: string;
  marketId: string;
  side: OrderSide;
  size: number;
  leverage: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercentage: number;
  liquidationPrice: number;
}

export interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

export interface PastOrder {
  id: string;
  marketId: string;
  side: OrderSide;
  type: OrderType;
  size: number;
  price: number;
  realizedPnl: number;
  time: string;
}
