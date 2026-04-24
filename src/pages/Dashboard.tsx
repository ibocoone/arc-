import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useUser } from "../contexts/UserContext";
import { formatCurrency, cn } from "../lib/utils";
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart2, Clock, X } from "lucide-react";

interface DashboardProps {
  onClose: () => void;
  livePrices: Record<string, number>;
}

export default function Dashboard({ onClose, livePrices }: DashboardProps) {
  const { user, userData } = useUser();
  const [positions, setPositions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const posUnsub = onSnapshot(query(collection(db, `users/${user.uid}/positions`)), snap => {
      setPositions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const ordUnsub = onSnapshot(query(collection(db, `users/${user.uid}/orders`)), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setHistory(all.filter(o => o.status === 'CLOSED' || o.status === 'LIQUIDATED')
        .sort((a, b) => (b.closedAt?.seconds || b.createdAt?.seconds || 0) - (a.closedAt?.seconds || a.createdAt?.seconds || 0)));
    });

    return () => { posUnsub(); ordUnsub(); };
  }, [user]);

  // Stats
  const totalPnL = positions.reduce((acc, pos) => {
    const mark = livePrices[pos.marketId] || pos.entryPrice;
    const pnl = pos.side === 'LONG'
      ? (mark - pos.entryPrice) * (pos.size / pos.entryPrice)
      : (pos.entryPrice - mark) * (pos.size / pos.entryPrice);
    return acc + pnl;
  }, 0);

  const totalRealizedPnL = history.reduce((acc, o) => acc + (o.realizedPnl || 0), 0);
  const winTrades = history.filter(o => (o.realizedPnl || 0) > 0).length;
  const winRate = history.length > 0 ? ((winTrades / history.length) * 100).toFixed(1) : '0';
  const totalMarginUsed = positions.reduce((acc, p) => acc + (p.margin || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-start justify-center overflow-y-auto py-8">
      <div className="w-full max-w-5xl mx-4 bg-dex-bg border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Dashboard</h2>
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mt-1">
              {user ? `${user.address.slice(0,6)}...${user.address.slice(-4)}` : 'Not connected'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {!user ? (
          <div className="p-20 text-center text-white/30 font-bold uppercase tracking-widest">
            Connect your wallet to view dashboard
          </div>
        ) : loading ? (
          <div className="p-20 text-center text-white/30">Loading...</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Balance"
                value={`$${formatCurrency(userData?.balance || 0)}`}
                sub="USDC"
                icon={<DollarSign size={18} />}
                color="text-white"
              />
              <StatCard
                label="Unrealized PnL"
                value={`${totalPnL >= 0 ? '+' : ''}$${formatCurrency(totalPnL)}`}
                sub={`${positions.length} open position${positions.length !== 1 ? 's' : ''}`}
                icon={<Activity size={18} />}
                color={totalPnL >= 0 ? "text-dex-up" : "text-dex-down"}
              />
              <StatCard
                label="Realized PnL"
                value={`${totalRealizedPnL >= 0 ? '+' : ''}$${formatCurrency(totalRealizedPnL)}`}
                sub={`${history.length} closed trades`}
                icon={totalRealizedPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                color={totalRealizedPnL >= 0 ? "text-dex-up" : "text-dex-down"}
              />
              <StatCard
                label="Win Rate"
                value={`${winRate}%`}
                sub={`${winTrades}/${history.length} wins`}
                icon={<BarChart2 size={18} />}
                color={parseFloat(winRate) >= 50 ? "text-dex-up" : "text-dex-down"}
              />
            </div>

            {/* Open Positions */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-3">
                Open Positions ({positions.length})
              </h3>
              {positions.length === 0 ? (
                <div className="p-8 text-center text-white/20 text-[11px] font-bold uppercase border border-white/5 rounded">
                  No open positions
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map(pos => {
                    const mark = livePrices[pos.marketId] || pos.entryPrice;
                    const pnl = pos.side === 'LONG'
                      ? (mark - pos.entryPrice) * (pos.size / pos.entryPrice)
                      : (pos.entryPrice - mark) * (pos.size / pos.entryPrice);
                    const pct = (pnl / pos.margin) * 100;
                    return (
                      <div key={pos.id} className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="font-black uppercase">{pos.marketId}</span>
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                            pos.side === 'LONG' ? "bg-dex-up/20 text-dex-up" : "bg-dex-down/20 text-dex-down")}>
                            {pos.side} {pos.leverage}x
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-white/40">Entry: ${formatCurrency(pos.entryPrice)} → Mark: ${formatCurrency(mark)}</div>
                          <div className={cn("font-black font-mono", pnl >= 0 ? "text-dex-up" : "text-dex-down")}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trade History */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-3">
                Recent History
              </h3>
              {history.length === 0 ? (
                <div className="p-8 text-center text-white/20 text-[11px] font-bold uppercase border border-white/5 rounded">
                  No trade history
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase font-black text-white/30 tracking-widest">
                        <th className="pb-3 pr-4">Time</th>
                        <th className="pb-3 px-4">Asset</th>
                        <th className="pb-3 px-4">Side</th>
                        <th className="pb-3 px-4">Size</th>
                        <th className="pb-3 px-4 text-right">Realized PnL</th>
                        <th className="pb-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 20).map(order => (
                        <tr key={order.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 pr-4 text-white/30 text-[10px]">
                            {order.closedAt?.toDate?.()?.toLocaleString() || order.createdAt?.toDate?.()?.toLocaleString() || '—'}
                          </td>
                          <td className="py-3 px-4 font-black uppercase text-sm">{order.marketId}</td>
                          <td className="py-3 px-4">
                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                              order.side === 'LONG' ? "bg-dex-up/20 text-dex-up" : "bg-dex-down/20 text-dex-down")}>
                              {order.side}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm">${formatCurrency(order.size || 0)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={cn("font-black font-mono", (order.realizedPnl || 0) >= 0 ? "text-dex-up" : "text-dex-down")}>
                              {(order.realizedPnl || 0) >= 0 ? '+' : ''}{formatCurrency(order.realizedPnl || 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                              order.status === 'LIQUIDATED' ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/60")}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
        <span className="text-white/20">{icon}</span>
      </div>
      <div className={cn("text-xl font-black font-mono", color)}>{value}</div>
      <div className="text-[10px] text-white/30 mt-1 font-bold">{sub}</div>
    </div>
  );
}
