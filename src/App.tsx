import { useState } from "react";
import Header from "./components/layout/Header";
import MarketStats from "./components/trading/MarketStats";
import TradingChart from "./components/trading/TradingChart";
import OrderPanel from "./components/trading/OrderPanel";
import PositionsTable from "./components/trading/PositionsTable";
import { RWA_MARKETS } from "./constants/markets";
import { Market, Position, OrderSide } from "./types/trading";
import { cn, formatCurrency } from "./lib/utils";
import { Search, ChevronRight, Globe, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const MOCK_POSITIONS: Position[] = [
  {
    id: "1",
    marketId: "xau-usd",
    side: OrderSide.LONG,
    size: 5000,
    leverage: 10,
    entryPrice: 2310.20,
    markPrice: 2384.45,
    pnl: 160.80,
    pnlPercentage: 32.16,
    liquidationPrice: 2105.50,
  }
];

export default function App() {
  const [selectedMarket, setSelectedMarket] = useState<Market>(RWA_MARKETS[0]);

  return (
    <div className="flex flex-col h-screen bg-dex-bg text-dex-text overflow-hidden select-none font-sans">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Market Selector */}
        <aside className="w-72 border-r border-white/10 flex flex-col bg-dex-bg hidden lg:flex">
          <div className="p-6">
            <span className="label-caps mb-4 block tracking-[0.2em]">Select Asset</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
              <input 
                type="text" 
                placeholder="SEARCH..." 
                className="w-full bg-white/5 border border-white/10 rounded py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
            <div className="text-[10px] uppercase font-black text-white/20 tracking-[0.3em] flex items-center justify-between mb-4">
              Real World Assets
            </div>
            
            {RWA_MARKETS.map((market) => (
              <button
                key={market.id}
                onClick={() => setSelectedMarket(market)}
                className={cn(
                  "w-full p-4 flex items-center justify-between transition-all rounded border",
                  selectedMarket.id === market.id 
                    ? "bg-white/10 border-white/20" 
                    : "bg-transparent border-transparent hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    market.category === "Commodity" ? "bg-yellow-500" : market.category === "Forex" ? "bg-blue-500" : "bg-purple-500"
                  )} />
                  <div className="flex flex-col items-start leading-none">
                    <span className={cn(
                      "font-black text-sm uppercase tracking-tighter",
                      selectedMarket.id === market.id ? "text-white" : "text-white/60"
                    )}>
                      {market.symbol}
                    </span>
                    <span className="text-[9px] font-bold text-white/30 uppercase mt-1 tracking-widest">{market.category}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end leading-none">
                  <span className="text-xs font-black font-mono tracking-tighter">
                    {formatCurrency(market.price, market.category === "Forex" ? 4 : 2)}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black font-mono mt-1",
                    market.change24h >= 0 ? "text-dex-up" : "text-dex-down"
                  )}>
                    {market.change24h >= 0 ? "+" : ""}{market.change24h}%
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="p-8 border-t border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Network Health</span>
            </div>
            <div className="flex-1 bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[90%]" />
            </div>
          </div>
        </aside>

        {/* Center: Trading Area */}
        <section className="flex-1 flex flex-col min-w-0 bg-dex-bg overflow-y-auto">
          <MarketStats market={selectedMarket} />
          
          <div className="flex-1 flex flex-col">
            <div className="h-[450px] relative">
              <TradingChart market={selectedMarket} />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none">
                 <span className="text-[15rem] font-black tracking-tighter uppercase whitespace-nowrap">ARC.NET</span>
              </div>
            </div>
            
            <div className="mt-auto">
              <PositionsTable positions={MOCK_POSITIONS} />
            </div>
          </div>
        </section>

        {/* Right Sidebar: Order Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key="order-panel"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden xl:block"
          >
            <OrderPanel market={selectedMarket} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Footer Navigation */}
      <nav className="md:hidden h-20 border-t border-white/10 bg-dex-bg flex items-center justify-around px-4">
        <button className="flex flex-col items-center gap-1.5 text-white">
          <ChevronRight className="w-5 h-5 -rotate-90 text-white" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Trade</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-white/40">
          <BarChart3 size={20} className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Markets</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-white/40">
          <Layers size={20} className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Portfolio</span>
        </button>
      </nav>
    </div>
  );
}

function BarChart3({ size, className }: { size: number, className?: string }) {
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
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

