import { Market } from "../types/trading";

export const RWA_MARKETS: Market[] = [
  // ── CRYPTO (live Binance WS) ─────────────────────────────
  { id: "BTCUSDT",  name: "Bitcoin",        symbol: "BTC/USDT",  price: 0, change24h: 0, volume24h: 0, category: "Crypto",    fundingRate: 0.010, borrowRate: 0.05, priceDecimals: 2 },
  { id: "ETHUSDT",  name: "Ethereum",       symbol: "ETH/USDT",  price: 0, change24h: 0, volume24h: 0, category: "Crypto",    fundingRate: 0.010, borrowRate: 0.05, priceDecimals: 2 },
  { id: "SOLUSDT",  name: "Solana",         symbol: "SOL/USDT",  price: 0, change24h: 0, volume24h: 0, category: "Crypto",    fundingRate: 0.012, borrowRate: 0.06, priceDecimals: 2 },
  { id: "BNBUSDT",  name: "BNB",            symbol: "BNB/USDT",  price: 0, change24h: 0, volume24h: 0, category: "Crypto",    fundingRate: 0.010, borrowRate: 0.04, priceDecimals: 2 },

  // ── FOREX (live Binance WS) ──────────────────────────────
  { id: "EURUSDT",  name: "Euro",           symbol: "EUR/USD",   price: 0, change24h: 0, volume24h: 0, category: "Forex",     fundingRate: 0.003, borrowRate: 0.01, priceDecimals: 4 },
  { id: "GBPUSDT",  name: "British Pound",  symbol: "GBP/USD",   price: 0, change24h: 0, volume24h: 0, category: "Forex",     fundingRate: 0.003, borrowRate: 0.01, priceDecimals: 4 },

  // ── COMMODITIES (prix via API serveur /api/rwa-prices) ───
  { id: "XAUUSD",   name: "Gold",           symbol: "XAU/USD",   price: 0, change24h: 0, volume24h: 0, category: "Commodity", fundingRate: 0.005, borrowRate: 0.02, priceDecimals: 2, isRWA: true },
  { id: "XAGUSD",   name: "Silver",         symbol: "XAG/USD",   price: 0, change24h: 0, volume24h: 0, category: "Commodity", fundingRate: 0.005, borrowRate: 0.02, priceDecimals: 3, isRWA: true },

  // ── STOCKS tokenized (prix via API serveur /api/rwa-prices) ─
  { id: "AAPL",     name: "Apple",          symbol: "AAPL",      price: 0, change24h: 0, volume24h: 0, category: "Stocks",    fundingRate: 0.008, borrowRate: 0.03, priceDecimals: 2, isRWA: true },
  { id: "TSLA",     name: "Tesla",          symbol: "TSLA",      price: 0, change24h: 0, volume24h: 0, category: "Stocks",    fundingRate: 0.010, borrowRate: 0.04, priceDecimals: 2, isRWA: true },
];
