import { useState, useEffect } from "react";
import { Position, OrderSide, PastOrder } from "../../types/trading";
import { formatCurrency, cn } from "../../lib/utils";
import { ExternalLink, X, Loader2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useUser } from "../../contexts/UserContext";

type TabType = "POSITIONS" | "OPEN_ORDERS" | "HISTORY";

export default function PositionsTable() {
  const { user, userData } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("POSITIONS");
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPositions([]);
      setOrders([]);
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time Positions
    const posQuery = query(collection(db, `users/${user.uid}/positions`));
    const unsubscribePos = onSnapshot(posQuery, (snapshot) => {
      const posData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Position));
      setPositions(posData);
      setLoading(false);
    });

    // Real-time Orders & History
    const orderQuery = query(collection(db, `users/${user.uid}/orders`));
    const unsubscribeOrders = onSnapshot(orderQuery, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setOrders(allOrders.filter(o => o.status === 'OPEN'));
      setHistory([...allOrders].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    return () => {
      unsubscribePos();
      unsubscribeOrders();
    };
  }, [user]);

  const handleClosePosition = async (pos: Position) => {
    if (!user || !userData) return;

    if (!confirm(`Are you sure you want to close your ${pos.marketId} position?`)) return;

    try {
      setLoading(true);
      const idToken = await user.getIdToken();

      const response = await fetch('/api/trading/close-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ positionId: pos.id })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to close position");

      alert("Position closed securely by Arc Server");
    } catch (err: any) {
      console.error("Failed to close position:", err);
      alert(err.message || "Failed to close position");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-dex-bg overflow-hidden flex flex-col p-8 pt-0">
      <div className="flex space-x-8 border-b border-white/10 mb-6">
        <button 
          onClick={() => setActiveTab("POSITIONS")}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === "POSITIONS" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white"
          )}
        >
          Positions ({positions.length})
        </button>
        <button 
          onClick={() => setActiveTab("OPEN_ORDERS")}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === "OPEN_ORDERS" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white"
          )}
        >
          Open Orders ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab("HISTORY")}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === "HISTORY" ? "border-b-2 border-white text-white" : "text-white/40 hover:text-white"
          )}
        >
          History
        </button>
      </div>

      <div className="overflow-x-auto min-h-[300px]">
        {!user ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <span className="label-caps opacity-20">Login to view your trading data</span>
          </div>
        ) : loading ? (
          <div className="py-20 text-center flex justify-center">
            <Loader2 className="animate-spin text-white/20" size={32} />
          </div>
        ) : (
          <>
            {activeTab === "POSITIONS" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">
                    <th className="pb-4 pr-6">Asset</th>
                    <th className="pb-4 px-6">Size</th>
                    <th className="pb-4 px-6">Entry Price</th>
                    <th className="pb-4 px-6">Mark Price</th>
                    <th className="pb-4 px-6 text-right">PnL (USDC)</th>
                    <th className="pb-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono tracking-tighter text-white">
                  {positions.length > 0 ? (
                    positions.map((pos) => (
                      <tr key={pos.id} className="data-table-row group border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-white uppercase">{pos.marketId}</span>
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                              pos.side === OrderSide.LONG ? "bg-dex-up/20 text-dex-up" : "bg-dex-down/20 text-dex-down"
                            )}>
                              {pos.side} {pos.leverage}X
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium">${formatCurrency(pos.size)}</td>
                        <td className="py-4 px-6 text-white/60">{formatCurrency(pos.entryPrice)}</td>
                        <td className="py-4 px-6 text-white/60">{formatCurrency(pos.markPrice)}</td>
                        <td className="py-4 px-6 text-right">
                          <div className={cn(
                            "font-bold",
                            pos.pnl >= 0 ? "text-dex-up" : "text-dex-down"
                          )}>
                            {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                            <span className="ml-1 text-[10px] opacity-80">({pos.pnlPercentage >= 0 ? "+" : ""}{pos.pnlPercentage}%)</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleClosePosition(pos)}
                              className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <span className="label-caps opacity-20">No active positions</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "OPEN_ORDERS" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">
                    <th className="pb-4 pr-6">Time</th>
                    <th className="pb-4 px-6">Asset</th>
                    <th className="pb-4 px-6">Type</th>
                    <th className="pb-4 px-6">Price</th>
                    <th className="pb-4 px-6 text-right">Size</th>
                    <th className="pb-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono tracking-tighter text-white">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="data-table-row group border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-4 pr-6 text-white/40 whitespace-nowrap text-[10px]">
                          {order.createdAt?.toDate().toLocaleString() || 'Pending...'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-white uppercase">{order.marketId}</span>
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                              order.side === "LONG" ? "bg-dex-up/20 text-dex-up" : "bg-dex-down/20 text-dex-down"
                            )}>
                              {order.side} {order.leverage}X
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[10px] font-black uppercase text-white/60 tracking-widest">{order.type}</td>
                        <td className="py-4 px-6 text-white">${formatCurrency(order.price)}</td>
                        <td className="py-4 px-6 text-right font-medium">${formatCurrency(order.size)}</td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={async () => {
                              if (!confirm("Cancel this order?")) return;
                              try {
                                const idToken = await user!.getIdToken();
                                await fetch('/api/trading/cancel-order', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                                  body: JSON.stringify({ orderId: order.id })
                                });
                              } catch (e) { alert("Failed to cancel"); }
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <span className="label-caps opacity-20">No open orders</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "HISTORY" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">
                    <th className="pb-4 pr-6">Time</th>
                    <th className="pb-4 px-6">Asset</th>
                    <th className="pb-4 px-6">Type</th>
                    <th className="pb-4 px-6 text-right">Size</th>
                    <th className="pb-4 px-6 text-right">Realized PnL</th>
                    <th className="pb-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono tracking-tighter text-white">
                  {history.length > 0 ? history.map((order) => (
                    <tr key={order.id} className="data-table-row group border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-4 pr-6 text-white/40 whitespace-nowrap text-[10px]">
                        {order.createdAt?.toDate().toLocaleString() || 'Pending...'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white uppercase">{order.marketId}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[10px] font-black uppercase text-white/60 tracking-widest">
                        {order.type?.replace("_", " ")}
                      </td>
                      <td className="py-4 px-6 text-right font-medium">${formatCurrency(order.size)}</td>
                      <td className="py-4 px-6 text-right">
                        <div className={cn(
                          "font-bold",
                          (order.realizedPnl || 0) >= 0 ? "text-dex-up" : "text-dex-down"
                        )}>
                          {(order.realizedPnl || 0) >= 0 ? "+" : ""}{formatCurrency(order.realizedPnl || 0)}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <ExternalLink size={14} className="text-white/20 hover:text-white cursor-pointer ml-auto" />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <span className="label-caps opacity-20">History is empty</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BarChart({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
