import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import axios from 'axios';
import WebSocket from 'ws';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

// Initialize Firebase Admin
let appInstance;
if (!admin.apps.length) {
  appInstance = admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
} else {
  appInstance = admin.app();
}

const db = (admin as any).firestore(firebaseConfig.firestoreDatabaseId);

// -----------------------------------------------------------------------------
// FINANCIAL-GRADE TRADING ENGINE (ORDER & RISK)
// -----------------------------------------------------------------------------

const currentPrices = new Map<string, number>();

class ArcTradingEngine {
  // SCANNER LOOP: Monitor Liquidations, SL/TP AND Limit Orders
  static async processMarketUpdate() {
    if (currentPrices.size === 0) return;

    try {
      // 1. RISK ENGINE: SCAN FOR LIQUIDATIONS, SL, TP
      const positionsSnapshot = await db.collectionGroup('positions').get();
      for (const doc of positionsSnapshot.docs) {
        const pos = doc.data();
        const currentPrice = currentPrices.get(pos.marketId);
        if (!currentPrice) continue;

        let shouldClose = false;
        let closeType = 'LIQUIDATION';

        // Liquidation check
        if (pos.side === 'LONG' && currentPrice <= pos.liquidationPrice) shouldClose = true;
        if (pos.side === 'SHORT' && currentPrice >= pos.liquidationPrice) shouldClose = true;

        // Stop Loss check
        if (!shouldClose && pos.stopLoss) {
          if (pos.side === 'LONG' && currentPrice <= pos.stopLoss) { shouldClose = true; closeType = 'STOP_LOSS'; }
          if (pos.side === 'SHORT' && currentPrice >= pos.stopLoss) { shouldClose = true; closeType = 'STOP_LOSS'; }
        }

        // Take Profit check
        if (!shouldClose && pos.takeProfit) {
          if (pos.side === 'LONG' && currentPrice >= pos.takeProfit) { shouldClose = true; closeType = 'TAKE_PROFIT'; }
          if (pos.side === 'SHORT' && currentPrice <= pos.takeProfit) { shouldClose = true; closeType = 'TAKE_PROFIT'; }
        }

        if (shouldClose) {
          await this.executeAutoClose(doc.ref, pos, currentPrice, closeType);
        }
      }

      // 2. MATCHING ENGINE: SCAN FOR LIMIT ORDERS
      const ordersSnapshot = await db.collectionGroup('orders')
        .where('status', '==', 'OPEN')
        .get();

      for (const doc of ordersSnapshot.docs) {
        const order = doc.data();
        const currentPrice = currentPrices.get(order.marketId);
        if (!currentPrice) continue;

        let shouldFill = false;
        if (order.type === 'LIMIT') {
          if (order.side === 'LONG' && currentPrice <= order.price) shouldFill = true;
          if (order.side === 'SHORT' && currentPrice >= order.price) shouldFill = true;
        }

        if (shouldFill) {
          await this.executeOrderFill(doc.ref, order, currentPrice);
        }
      }
    } catch (err) {
      console.error('Engine Loop Error:', err);
    }
  }

  private static async executeAutoClose(posRef: any, pos: any, price: number, reason: string) {
    console.log(`🤖 [AUTO-CLOSE] ${reason} | ${pos.marketId} @ ${price}`);
    await db.runTransaction(async (tx) => {
      // Return margin + Pnl if not liquidated
      let realizedPnl = 0;
      if (pos.side === 'LONG') realizedPnl = (price - pos.entryPrice) * (pos.size / pos.entryPrice);
      else realizedPnl = (pos.entryPrice - price) * (pos.size / pos.entryPrice);

      const userRef = db.doc(`users/${pos.userId}`);
      const userDoc = await tx.get(userRef);
      const userData = userDoc.data();

      // If Liquidation, users loses entire margin. If SL/TP, they get remainder + pnl.
      const returnAmount = reason === 'LIQUIDATION' ? 0 : (pos.margin + realizedPnl);
      
      if (returnAmount > 0) {
        tx.update(userRef, { balance: userData.balance + returnAmount });
      }

      tx.delete(posRef);
      tx.set(db.collection(`users/${pos.userId}/orders`).doc(), {
        ...pos,
        type: 'CLOSE',
        closeReason: reason,
        price,
        realizedPnl,
        status: reason === 'LIQUIDATION' ? 'LIQUIDATED' : 'CLOSED',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  private static async executeOrderFill(orderRef: any, order: any, price: number) {
    console.log(`🎯 [MATCHED] ${order.type} ${order.side} ${order.marketId} @ ${price}`);
    await db.runTransaction(async (tx) => {
      // Update order status
      tx.update(orderRef, { status: 'FILLED', filledAt: admin.firestore.FieldValue.serverTimestamp(), price });

      // Create Position
      const positionRef = db.collection(`users/${order.userId}/positions`).doc();
      tx.set(positionRef, {
        userId: order.userId,
        marketId: order.marketId,
        side: order.side,
        size: order.size * order.leverage,
        margin: order.size,
        leverage: order.leverage,
        entryPrice: price,
        markPrice: price,
        liquidationPrice: price * (order.side === 'LONG' ? 0.92 : 1.08),
        pnl: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }
}

function startLiquidationWorker() {
  const symbols = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt'];
  const wsUrl = `wss://stream.binance.com:9443/ws/${symbols.join('@ticker/') + '@ticker'}`;

  const ws = new WebSocket(wsUrl);

  ws.on('open', () => console.log('🛡️ ARC Trading Engine connected to Binance WebSocket'));
  
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data);
      if (msg.s && msg.c) {
        currentPrices.set(msg.s, parseFloat(msg.c));
      }
    } catch (err) {
      console.error('WS Message Parse Error:', err);
    }
  });

  ws.on('error', (err) => console.error('Engine WS Error:', err));
  ws.on('close', () => { setTimeout(startLiquidationWorker, 5000); });

  // RUN ENGINE LOOP
  setInterval(() => ArcTradingEngine.processMarketUpdate(), 3000);
}

// Start the worker
startLiquidationWorker();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Firebase ID Token
  const verifyAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // PRODUCTION GRADE: Secure Order Execution
  app.post('/api/trading/open-order', verifyAuth, async (req: any, res) => {
    const { marketId, side, size, leverage, orderType, limitPrice, stopLoss, takeProfit } = req.body;
    const userId = req.user.uid;

    try {
      const tradeSize = parseFloat(size);
      
      await db.runTransaction(async (transaction) => {
        const userRef = db.doc(`users/${userId}`);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) throw new Error("User does not exist");
        const userData = userDoc.data()!;
        if (userData.balance < tradeSize) throw new Error("Insufficient balance");

        // 1. Deduct Margin (Escrow)
        transaction.update(userRef, {
          balance: userData.balance - tradeSize,
          lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });

        const orderRef = db.collection(`users/${userId}/orders`).doc();

        if (orderType === 'MARKET') {
          // MARKET ORDER: Immediate Execution
          const priceRes = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${marketId}`);
          const executionPrice = parseFloat(priceRes.data.price);
          
          const positionRef = db.collection(`users/${userId}/positions`).doc();
          
          transaction.set(positionRef, {
            userId, marketId, side, size: tradeSize * leverage, margin: tradeSize, leverage,
            entryPrice: executionPrice, markPrice: executionPrice,
            liquidationPrice: executionPrice * (side === 'LONG' ? 0.92 : 1.08),
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            pnl: 0, createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          transaction.set(orderRef, {
            userId, marketId, side, type: orderType, size: tradeSize, price: executionPrice,
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            status: 'FILLED', createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // LIMIT / STOP_LIMIT: Place in Order Book
          transaction.set(orderRef, {
            userId, marketId, side, type: orderType, size: tradeSize, leverage,
            price: parseFloat(limitPrice), status: 'OPEN',
            stopLoss: stopLoss ? parseFloat(stopLoss) : null,
            takeProfit: takeProfit ? parseFloat(takeProfit) : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      res.json({ success: true, message: orderType === 'MARKET' ? "Order Filled" : "Limit Order Placed" });
    } catch (error: any) {
      console.error("Order Execution Failure:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/trading/verify-price', async (req, res) => {
    try {
      const { symbol } = req.query;
      if (!symbol) return res.status(400).json({ error: "Symbol required" });
      const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      res.json({ symbol: response.data.symbol, price: parseFloat(response.data.price) });
    } catch (error) {
      res.status(500).json({ error: "Oracle failure" });
    }
  });

  app.post('/api/trading/close-position', verifyAuth, async (req: any, res) => {
    const { positionId } = req.body;
    const userId = req.user.uid;

    try {
      await db.runTransaction(async (transaction) => {
        const posRef = db.doc(`users/${userId}/positions/${positionId}`);
        const posDoc = await transaction.get(posRef);
        if (!posDoc.exists) throw new Error("Position not found");
        
        const posData = posDoc.data()!;
        const priceRes = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${posData.marketId}`);
        const currentPrice = parseFloat(priceRes.data.price);
        
        // Calculate realized PnL
        let pnl = 0;
        if (posData.side === 'LONG') {
          pnl = (currentPrice - posData.entryPrice) * (posData.size / posData.entryPrice);
        } else {
          pnl = (posData.entryPrice - currentPrice) * (posData.size / posData.entryPrice);
        }

        const userRef = db.doc(`users/${userId}`);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data()!;

        // Update balance: Return Margin + PnL
        transaction.update(userRef, {
          balance: userData.balance + posData.margin + pnl
        });

        // Delete position & log history
        transaction.delete(posRef);
        transaction.set(db.collection(`users/${userId}/orders`).doc(), {
          ...posData,
          type: 'CLOSE',
          price: currentPrice,
          realizedPnl: pnl,
          status: 'CLOSED',
          closedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/trading/cancel-order', verifyAuth, async (req: any, res) => {
    const { orderId } = req.body;
    const userId = req.user.uid;

    try {
      await db.runTransaction(async (transaction) => {
        const orderRef = db.doc(`users/${userId}/orders/${orderId}`);
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) throw new Error("Order not found");
        if (orderDoc.data()!.status !== 'OPEN') throw new Error("Order already filled or cancelled");
        
        const orderData = orderDoc.data()!;
        const userRef = db.doc(`users/${userId}`);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data()!;

        // Refund margin
        transaction.update(userRef, { balance: userData.balance + orderData.size });
        transaction.update(orderRef, { status: 'CANCELLED', cancelledAt: admin.firestore.FieldValue.serverTimestamp() });
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start backend server:', err);
  process.exit(1);
});
