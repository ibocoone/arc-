# ARC PERP — Perpetual DEX for Real World Assets

A perpetual trading DEX built on Arc Testnet, supporting crypto, commodities, forex and tokenized stocks — all settled in USDC.

## Features

- **10 tradable markets** — BTC, ETH, SOL, BNB, Gold, Silver, EUR/USD, GBP/USD, AAPL, TSLA
- **Up to 100x leverage** on all markets
- **Order types** — Market, Limit, Stop-Limit, Trailing Stop
- **Risk management** — Stop Loss, Take Profit, auto-liquidation engine
- **Live PnL** — real-time position tracking
- **AI assistant** — powered by Gemini
- **Wallet connect** — MetaMask with auto Arc Testnet switch
- **Dashboard** — portfolio overview, trade history, win rate

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- Express.js + WebSocket (Binance live prices)
- Firebase Firestore (positions, orders, balances)
- Twelve Data API (Gold, Silver, Stocks)
- Google Gemini AI (trading assistant)
- Ethers.js (wallet connection)

## Getting Started

```bash
npm install
npm run dev
```

Add your environment variables in `.env`:
```
GEMINI_API_KEY=your_key
TWELVE_DATA_KEY=your_key
FIREBASE_SERVICE_ACCOUNT=your_json
```

## Arc Testnet

| Field | Value |
|-------|-------|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Currency | USDC |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |
