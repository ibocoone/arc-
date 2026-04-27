import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

const require = createRequire(import.meta.url);

// Firebase config — hardcoded for reliability
const firebaseConfig = {
  projectId: "test2-6b5b2",
  firestoreDatabaseId: "(default)",
};

// Support service account from env var (Render/Railway) or file (local)
let serviceAccount: any;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('./service-account.json');
}

// ─── Firebase Admin Init ────────────────────────────────────────────────────
const adminApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

// Use default Firestore database (project test2-6b5b2)
const db = getFirestore(adminApp);

// ─── Universal Price Oracle ─────────────────────────────────────────────────
// Holds latest prices for ALL assets (Binance + RWA)
const currentPrices = new Map<string, number>();
const rwaPriceChanges = new Map<string, number>();

// Binance WS for crypto + forex
function startPriceFeed() {
  const symbols = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'eurusdt', 'gbpusdt'];
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbols.join('@ticker/') + '@ticker'}`;
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => console.log('🛡️ ARC Engine: Binance WS connected'));
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data);
      if (msg.s && msg.c) currentPrices.set(msg.s, parseFloat(msg.c));
    } catch {}
  });
  ws.on('error', () => {});
  ws.on('close', () => setTimeout(startPriceFeed, 5000));
}

// Poll RWA prices (Gold, Silver, Stocks) every 30s
async function pollRWAPrices() {
  const TWELVE_KEY = process.env.TWELVE_DATA_KEY || '';
  const fallbacks: Record<string, number> = {
    XAUUSD: 3320.50, XAGUSD: 32.85, AAPL: 213.49, TSLA: 248.23,
  };

  // Set fallbacks immediately so engine has prices
  for (const [k, v] of Object.entries(fallbacks)) {
    if (!currentPrices.has(k)) currentPrices.set(k, v);
  }

  if (!TWELVE_KEY) return;

  try {
    const r = await axios.get(
      `https://api.twelvedata.com/quote?symbol=XAU/USD,XAG/USD,AAPL,TSLA&apikey=${TWELVE_KEY}`,
      { timeout: 6000 }
    );
    const d = r.data;
    const map: Record<string, string> = { 'XAU/USD': 'XAUUSD', 'XAG/USD': 'XAGUSD', AAPL: 'AAPL', TSLA: 'TSLA' };
    for (const [sym, id] of Object.entries(map)) {
      if (d[sym]?.close) {
        currentPrices.set(id, parseFloat(d[sym].close));
        rwaPriceChanges.set(id, parseFloat(d[sym].percent_change || '0'));
      }
    }
    console.log('📊 RWA prices updated:', Object.fromEntries(
      ['XAUUSD','XAGUSD','AAPL','TSLA'].map(k => [k, currentPrices.get(k)])
    ));
  } catch (e) {
    console.warn('RWA price poll failed, using fallbacks');
  }
}

// ─── Trading Engine ─────────────────────────────────────────────────────────
class ArcTradingEngine {
  static async processMarketUpdate() {
    if (currentPrices.size === 0) return;
    try {
      const positionsSnapshot = await db.collectionGroup('positions').get();
      for (const doc of positionsSnapshot.docs) {
        const pos = doc.data();
        const price = currentPrices.get(pos.marketId);
        if (!price) continue;

        let shouldClose = false;
        let closeType = 'LIQUIDATION';

        if (pos.side === 'LONG'  && price <= pos.liquidationPrice) shouldClose = true;
        if (pos.side === 'SHORT' && price >= pos.liquidationPrice) shouldClose = true;
        if (!shouldClose && pos.stopLoss) {
          if (pos.side === 'LONG'  && price <= pos.stopLoss) { shouldClose = true; closeType = 'STOP_LOSS'; }
          if (pos.side === 'SHORT' && price >= pos.stopLoss) { shouldClose = true; closeType = 'STOP_LOSS'; }
        }
        if (!shouldClose && pos.takeProfit) {
          if (pos.side === 'LONG'  && price >= pos.takeProfit) { shouldClose = true; closeType = 'TAKE_PROFIT'; }
          if (pos.side === 'SHORT' && price <= pos.takeProfit) { shouldClose = true; closeType = 'TAKE_PROFIT'; }
        }
        if (shouldClose) await this.executeAutoClose(doc.ref, pos, price, closeType);
      }

      const ordersSnapshot = await db.collectionGroup('orders').where('status', '==', 'OPEN').get();
      for (const doc of ordersSnapshot.docs) {
        const order = doc.data();
        const price = currentPrices.get(order.marketId);
        if (!price) continue;
        if (order.type === 'LIMIT') {
          if ((order.side === 'LONG' && price <= order.price) || (order.side === 'SHORT' && price >= order.price)) {
            await this.executeOrderFill(doc.ref, order, price);
          }
        }
      }
    } catch (err: any) {
      // Suppress permission errors (wrong project) — log only unexpected errors
      if (!err.message?.includes('permission') && !err.code?.toString().includes('7')) {
        console.error('Engine Loop Error:', err.message);
      }
    }
  }

  private static async executeAutoClose(posRef: any, pos: any, price: number, reason: string) {
    console.log(`🤖 [AUTO-CLOSE] ${reason} | ${pos.marketId} @ ${price}`);
    await db.runTransaction(async (tx) => {
      let pnl = pos.side === 'LONG'
        ? (price - pos.entryPrice) * (pos.size / pos.entryPrice)
        : (pos.entryPrice - price) * (pos.size / pos.entryPrice);

      const userRef = db.doc(`users/${pos.userId}`);
      const userDoc = await tx.get(userRef);
      const userData = userDoc.data()!;
      const returnAmount = reason === 'LIQUIDATION' ? 0 : (pos.margin + pnl);
      if (returnAmount > 0) tx.update(userRef, { balance: userData.balance + returnAmount });
      tx.delete(posRef);
      tx.set(db.collection(`users/${pos.userId}/orders`).doc(), {
        ...pos, type: 'CLOSE', closeReason: reason, price, realizedPnl: pnl,
        status: reason === 'LIQUIDATION' ? 'LIQUIDATED' : 'CLOSED',
        timestamp: FieldValue.serverTimestamp()
      });
    });
  }

  private static async executeOrderFill(orderRef: any, order: any, price: number) {
    console.log(`🎯 [MATCHED] ${order.type} ${order.side} ${order.marketId} @ ${price}`);
    await db.runTransaction(async (tx) => {
      tx.update(orderRef, { status: 'FILLED', filledAt: FieldValue.serverTimestamp(), price });
      tx.set(db.collection(`users/${order.userId}/positions`).doc(), {
        userId: order.userId, marketId: order.marketId, side: order.side,
        size: order.size * order.leverage, margin: order.size, leverage: order.leverage,
        entryPrice: price, markPrice: price,
        liquidationPrice: price * (order.side === 'LONG' ? 0.92 : 1.08),
        pnl: 0, createdAt: FieldValue.serverTimestamp()
      });
    });
  }
}

// Start feeds
startPriceFeed();
pollRWAPrices();
setInterval(pollRWAPrices, 30000);
setInterval(() => ArcTradingEngine.processMarketUpdate(), 3000);

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');
  app.use(express.json());

  // Auth middleware — wallet address as Bearer token
  const verifyAuth = (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const address = auth.split('Bearer ')[1].toLowerCase();
    if (!address.startsWith('0x') || address.length !== 42) return res.status(401).json({ error: 'Invalid address' });
    req.user = { uid: address };
    next();
  };

  app.get('/api/health', (_, res) => res.json({ status: 'ok', prices: Object.fromEntries(currentPrices) }));

  // ── RWA Prices endpoint ──────────────────────────────────────────────────
  app.get('/api/rwa-prices', (_, res) => {
    const TWELVE_KEY = process.env.TWELVE_DATA_KEY || '';
    res.json({
      XAUUSD: { price: currentPrices.get('XAUUSD') || 3320.50, change24h: rwaPriceChanges.get('XAUUSD') ?? 0.42, hasLiveData: !!TWELVE_KEY },
      XAGUSD: { price: currentPrices.get('XAGUSD') || 32.85,   change24h: rwaPriceChanges.get('XAGUSD') ?? 0.18, hasLiveData: !!TWELVE_KEY },
      AAPL:   { price: currentPrices.get('AAPL')   || 213.49,  change24h: rwaPriceChanges.get('AAPL')   ?? -0.31, hasLiveData: !!TWELVE_KEY },
      TSLA:   { price: currentPrices.get('TSLA')   || 248.23,  change24h: rwaPriceChanges.get('TSLA')   ?? 1.24,  hasLiveData: !!TWELVE_KEY },
    });
  });

  // ── Get current price for any asset ─────────────────────────────────────
  const getAssetPrice = async (marketId: string): Promise<number> => {
    // 1. Check in-memory cache (covers all assets)
    const cached = currentPrices.get(marketId);
    if (cached) return cached;
    // 2. Try Binance REST
    try {
      const r = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${marketId}`, { timeout: 4000 });
      return parseFloat(r.data.price);
    } catch {}
    throw new Error(`Price unavailable for ${marketId}`);
  };

  // ── Open Order ───────────────────────────────────────────────────────────
  app.post('/api/trading/open-order', verifyAuth, async (req: any, res) => {
    const { marketId, side, size, leverage, orderType, limitPrice, stopLoss, takeProfit } = req.body;
    const userId = req.user.uid;
    try {
      const tradeSize = parseFloat(size);
      await db.runTransaction(async (tx) => {
        const userRef = db.doc(`users/${userId}`);
        const userDoc = await tx.get(userRef);

        let currentBalance: number;
        if (!userDoc.exists) {
          // Auto-create user with 10,000 USDC testnet balance
          currentBalance = 10000;
          tx.set(userRef, {
            uid: userId,
            address: userId,
            displayName: `${userId.slice(0,6)}...${userId.slice(-4)}`,
            balance: 10000,
            createdAt: FieldValue.serverTimestamp(),
          });
        } else {
          currentBalance = userDoc.data()!.balance;
        }

        if (currentBalance < tradeSize) throw new Error(`Insufficient balance (${currentBalance.toFixed(2)} USDC available)`);

        tx.update(userRef, { balance: currentBalance - tradeSize, lastActivity: FieldValue.serverTimestamp() });
        const orderRef = db.collection(`users/${userId}/orders`).doc();

        if (orderType === 'MARKET') {
          const executionPrice = await getAssetPrice(marketId);
          tx.set(db.collection(`users/${userId}/positions`).doc(), {
            userId, marketId, side,
            size: tradeSize * leverage, margin: tradeSize, leverage,
            entryPrice: executionPrice, markPrice: executionPrice,
            liquidationPrice: executionPrice * (side === 'LONG' ? 0.92 : 1.08),
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            pnl: 0, createdAt: FieldValue.serverTimestamp()
          });
          tx.set(orderRef, {
            userId, marketId, side, type: orderType, size: tradeSize,
            price: executionPrice, leverage,
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            status: 'FILLED', createdAt: FieldValue.serverTimestamp()
          });
        } else {
          tx.set(orderRef, {
            userId, marketId, side, type: orderType, size: tradeSize, leverage,
            price: parseFloat(limitPrice), status: 'OPEN',
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            createdAt: FieldValue.serverTimestamp()
          });
        }
      });
      res.json({ success: true, message: orderType === 'MARKET' ? 'Order Filled' : 'Limit Order Placed' });
    } catch (err: any) {
      console.error('Order Error:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // ── Close Position ───────────────────────────────────────────────────────
  app.post('/api/trading/close-position', verifyAuth, async (req: any, res) => {
    const { positionId } = req.body;
    const userId = req.user.uid;
    try {
      await db.runTransaction(async (tx) => {
        const posRef = db.doc(`users/${userId}/positions/${positionId}`);
        const posDoc = await tx.get(posRef);
        if (!posDoc.exists) throw new Error('Position not found');
        const pos = posDoc.data()!;
        const price = await getAssetPrice(pos.marketId);
        const pnl = pos.side === 'LONG'
          ? (price - pos.entryPrice) * (pos.size / pos.entryPrice)
          : (pos.entryPrice - price) * (pos.size / pos.entryPrice);

        const userRef = db.doc(`users/${userId}`);
        const userDoc = await tx.get(userRef);
        tx.update(userRef, { balance: userDoc.data()!.balance + pos.margin + pnl });
        tx.delete(posRef);
        tx.set(db.collection(`users/${userId}/orders`).doc(), {
          ...pos, type: 'CLOSE', price, realizedPnl: pnl,
          status: 'CLOSED', closedAt: FieldValue.serverTimestamp()
        });
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Cancel Order ─────────────────────────────────────────────────────────
  app.post('/api/trading/cancel-order', verifyAuth, async (req: any, res) => {
    const { orderId } = req.body;
    const userId = req.user.uid;
    try {
      await db.runTransaction(async (tx) => {
        const orderRef = db.doc(`users/${userId}/orders/${orderId}`);
        const orderDoc = await tx.get(orderRef);
        if (!orderDoc.exists) throw new Error('Order not found');
        if (orderDoc.data()!.status !== 'OPEN') throw new Error('Order already filled or cancelled');
        const userRef = db.doc(`users/${userId}`);
        const userDoc = await tx.get(userRef);
        tx.update(userRef, { balance: userDoc.data()!.balance + orderDoc.data()!.size });
        tx.update(orderRef, { status: 'CANCELLED', cancelledAt: FieldValue.serverTimestamp() });
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Vite / Static ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 ARC Server running at http://0.0.0.0:${PORT}`));
}

startServer().catch(err => { console.error('Server failed:', err); process.exit(1); });
