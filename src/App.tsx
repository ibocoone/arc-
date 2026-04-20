import { useState, useEffect } from "react";
import Header from "./components/layout/Header";
import MarketStats from "./components/trading/MarketStats";
import TradingViewChart from "./components/trading/TradingViewChart";
import OrderPanel from "./components/trading/OrderPanel";
import PositionsTable from "./components/trading/PositionsTable";
import AIChatAssistant from "./components/trading/AIChatAssistant";
import { RWA_MARKETS } from "./constants/markets";
import { Market } from "./types/trading";
import { cn, formatCurrency } from "./lib/utils";
import { Search, Globe, Layers, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [markets, setMarkets] = useState<Market[]>(RWA_MARKETS);
  const [selectedMarket, setSelectedMarket] = useState<Market>(RWA_MARKETS[0]);

  useEffect(() => {
    // REAL-TIME MARKET DATA INTEGRATION (BINANCE WEBSOCKET)
    // Connect to Binance's multiple ticker stream
    const symbols = markets.map(m => m.id.toLowerCase()).join('@ticker/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbols}@ticker`;
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const symbol = data.s;
      const newPrice = parseFloat(data.c);
      const change = parseFloat(data.P);
      const volume = parseFloat(data.q);

      setMarkets(prev => prev.map(m => {
        if (m.id === symbol) {
          return {
            ...m,
            price: newPrice,
            change24h: change,
            volume24h: volume
          };
        }
        return m;
      }));

      // Sync selected market
      if (symbol === selectedMarket.id) {
        setSelectedMarket(prev => ({
          ...prev,
          price: newPrice,
          change24h: change,
          volume24h: volume
        }));
      }
    };

    ws.onerror = (err) => console.error("Market WebSocket Error:", err);
    
    return () => ws.close();
  }, [selectedMarket.id]);

  return (
    <div className="flex flex-col h-screen bg-dex-bg text-dex-text overflow-hidden select-none font-sans transition-colors duration-300">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Market Selector */}
        <aside className="w-72 border-r border-white/10 flex flex-col bg-dex-bg hidden lg:flex">
          <div className="p-6">
            <span className="label-caps mb-4 block tracking-[0.2em]">Select Asset</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dex-muted w-4 h-4" />
              <input 
                type="text" 
                placeholder="SEARCH..." 
                className="w-full bg-white/5 border border-white/10 rounded py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 scrollbar-hide">
            <div className="text-[10px] uppercase font-black text-dex-muted tracking-[0.3em] flex items-center justify-between mb-4">
              Tradable Assets
            </div>
            
            {markets.map((market) => (
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
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className={cn(
                      "font-black text-sm uppercase tracking-tighter",
                      selectedMarket.id === market.id ? "text-dex-text" : "text-dex-muted text-white/50"
                    )}>
                      {market.symbol}
                    </span>
                    <span className="text-[9px] font-bold text-dex-muted mt-1 tracking-widest">{market.category}</span>
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
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dex-muted">Network Health</span>
            </div>
            <div className="flex-1 bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[94%] animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Center: Trading Area */}
        <section className="flex-1 flex flex-col min-w-0 bg-dex-bg overflow-hidden">
          <MarketStats market={selectedMarket} />
          
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
            <div className="h-[480px] relative shrink-0">
              <TradingViewChart market={selectedMarket} />
            </div>
            
            <div className="flex-1 min-h-[400px]">
              <PositionsTable />
            </div>
          </div>
        </section>

        {/* Right Sidebar: Order Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMarket.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden xl:block bg-dex-bg h-full"
          >
            <OrderPanel market={selectedMarket} />
          </motion.div>
        </AnimatePresence>
      </main>

      <AIChatAssistant currentMarket={selectedMarket} />

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

