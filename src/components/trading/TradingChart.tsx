import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Market } from "../../types/trading";
import { formatCurrency, cn } from "../../lib/utils";

interface TradingChartProps {
  market: Market;
}

export default function TradingChart({ market }: TradingChartProps) {
  const data = useMemo(() => {
    const points = 48;
    const basePrice = market.price;
    const volatility = 0.005; // 0.5% volatility
    
    return Array.from({ length: points }).map((_, i) => {
      const random = Math.random() * volatility * 2 - volatility;
      const price = basePrice * (1 + random + (Math.sin(i / 5) * 0.01));
      
      const date = new Date();
      date.setHours(date.getHours() - (points - i));
      
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: price,
      };
    });
  }, [market]);

  const depthData = useMemo(() => {
    const pointsCount = 40;
    const currentPrice = market.price;
    const spreadPercentage = 0.05; // 5% range
    
    const bids = [];
    let cumulativeBid = 0;
    for (let i = 0; i < pointsCount; i++) {
      const price = currentPrice * (1 - (i / pointsCount) * spreadPercentage);
      cumulativeBid += Math.random() * 50 + (pointsCount - i) * 2;
      bids.push({ price, bid: cumulativeBid, ask: null });
    }
    bids.reverse();

    const asks = [];
    let cumulativeAsk = 0;
    for (let i = 0; i < pointsCount; i++) {
      const price = currentPrice * (1 + (i / pointsCount) * spreadPercentage);
      cumulativeAsk += Math.random() * 50 + (i + 1) * 2;
      asks.push({ price, bid: null, ask: cumulativeAsk });
    }

    return [...bids, ...asks];
  }, [market]);

  return (
    <div className="w-full h-full p-8 flex flex-col gap-8">
      <div className="flex flex-col flex-1 gap-8">
        <div className="flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 border border-white/10 p-1">
              {["1H", "4H", "1D", "1W"].map((tf) => (
                <button 
                  key={tf}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase transition-all",
                    tf === "1H" ? "bg-white text-black" : "text-white/30 hover:text-white"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="text-right">
              <span className="label-caps text-white/30">Current Price</span>
              <div className="text-xl font-mono font-black text-white">
                {formatCurrency(market.price, market.category === "Forex" ? 4 : 2)}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={market.change24h >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={market.change24h >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={30}
                  tick={{ fontWeight: 700, fill: 'rgba(255,255,255,0.3)' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  orientation="right"
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => formatCurrency(val, market.category === "Forex" ? 4 : 2)}
                  tick={{ fontWeight: 700, fill: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
                  itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 900 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}
                  formatter={(value: number) => [formatCurrency(value, market.category === "Forex" ? 4 : 2), "PRICE"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={market.change24h >= 0 ? "#22c55e" : "#ef4444"} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="h-48 border-t border-white/5 pt-8 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="label-caps">Market Depth</span>
            <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5 text-dex-up">
                <div className="w-2 h-2 bg-dex-up/20 border border-dex-up/50" />
                Bids
              </div>
              <div className="flex items-center gap-1.5 text-dex-down">
                <div className="w-2 h-2 bg-dex-down/20 border border-dex-down/50" />
                Asks
              </div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={depthData}>
                <defs>
                  <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAsk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="price" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                  type="number"
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => formatCurrency(val, market.category === "Forex" ? 4 : 2)}
                  tick={{ fontWeight: 700, fill: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
                  itemStyle={{ color: '#ffffff', fontSize: '10px', fontWeight: 900 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '8px', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}
                  labelFormatter={(val) => `Price: ${formatCurrency(val, market.category === "Forex" ? 4 : 2)}`}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="bid" 
                  stroke="#22c55e" 
                  strokeWidth={1}
                  fillOpacity={1} 
                  fill="url(#colorBid)" 
                  animationDuration={500}
                  connectNulls
                />
                <Area 
                  type="stepAfter" 
                  dataKey="ask" 
                  stroke="#ef4444" 
                  strokeWidth={1}
                  fillOpacity={1} 
                  fill="url(#colorAsk)" 
                  animationDuration={500}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
