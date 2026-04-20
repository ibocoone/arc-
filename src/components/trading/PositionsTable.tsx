import { useState } from "react";
import { Position, OrderSide, PastOrder } from "../../types/trading";
import { formatCurrency, cn } from "../../lib/utils";
import { ExternalLink, X } from "lucide-react";

interface PositionsTableProps {
  positions: Position[];
}

const MOCK_HISTORY: PastOrder[] = [
  {
    id: "h1",
    marketId: "XAU/USD",
    side: OrderSide.LONG,
    type: "MARKET" as any,
    size: 2500,
    price: 2285.50,
    realizedPnl: 45.20,
    time: "2024-04-20 10:24",
  },
  {
    id: "h2",
    marketId: "EUR/USD",
    side: OrderSide.SHORT,
    type: "LIMIT" as any,
    size: 10000,
    price: 1.0842,
    realizedPnl: -12.40,
    time: "2024-04-19 15:45",
  },
  {
    id: "h3",
    marketId: "AAPL",
    side: OrderSide.LONG,
    type: "STOP_LIMIT" as any,
    size: 1500,
    price: 172.30,
    realizedPnl: 88.15,
    time: "2024-04-18 09:30",
  }
];

type TabType = "POSITIONS" | "OPEN_ORDERS" | "HISTORY";

export default function PositionsTable({ positions }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>("POSITIONS");

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
          Open Orders (0)
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
        {activeTab === "POSITIONS" && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">
                <th className="pb-4 pr-6">Asset</th>
                <th className="pb-4 px-6">Size</th>
                <th className="pb-4 px-6">Entry Price</th>
                <th className="pb-4 px-6">Mark Price</th>
                <th className="pb-4 px-6">Liq. Price</th>
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
                    <td className="py-4 px-6 text-dex-down/60 font-bold">{formatCurrency(pos.liquidationPrice)}</td>
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
                        <button className="text-[10px] font-black uppercase text-white/40 hover:text-white underline decoration-white/20 underline-offset-4">
                          Details
                        </button>
                        <button className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">
                          Close
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <span className="label-caps opacity-20">No active positions</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "OPEN_ORDERS" && (
          <div className="py-20 text-center">
            <span className="label-caps opacity-20">No open orders</span>
          </div>
        )}

        {activeTab === "HISTORY" && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">
                <th className="pb-4 pr-6">Time</th>
                <th className="pb-4 px-6">Asset</th>
                <th className="pb-4 px-6">Type</th>
                <th className="pb-4 px-6 text-right">Size</th>
                <th className="pb-4 px-6 text-right">Price</th>
                <th className="pb-4 px-6 text-right">Realized PnL</th>
                <th className="pb-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono tracking-tighter text-white">
              {MOCK_HISTORY.map((order) => (
                <tr key={order.id} className="data-table-row group border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-4 pr-6 text-white/40 whitespace-nowrap">{order.time}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white uppercase">{order.marketId}</span>
                      <span className={cn(
                        "text-[9px] font-black px-1 py-0.5 rounded uppercase tracking-tighter",
                        order.side === OrderSide.LONG ? "text-dex-up border border-dex-up/30" : "text-dex-down border border-dex-down/30"
                      )}>
                        {order.side}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[10px] font-black uppercase text-white/60 tracking-widest">
                    {order.type.replace("_", " ")}
                  </td>
                  <td className="py-4 px-6 text-right font-medium">${formatCurrency(order.size)}</td>
                  <td className="py-4 px-6 text-right text-white/60 font-mono tracking-tighter">{formatCurrency(order.price)}</td>
                  <td className="py-4 px-6 text-right">
                    <div className={cn(
                      "font-bold",
                      order.realizedPnl >= 0 ? "text-dex-up" : "text-dex-down"
                    )}>
                      {order.realizedPnl >= 0 ? "+" : ""}{formatCurrency(order.realizedPnl)}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={14} className="text-white/20 hover:text-white cursor-pointer" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
