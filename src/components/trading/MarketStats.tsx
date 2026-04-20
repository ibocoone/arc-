import { Market } from "../../types/trading";
import { formatCurrency, cn } from "../../lib/utils";
import { TrendingUp, TrendingDown, Clock, BarChart3 } from "lucide-react";

interface MarketStatsProps {
  market: Market;
}

export default function MarketStats({ market }: MarketStatsProps) {
  return (
    <div className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start gap-10">
      <div className="flex flex-col">
        <h1 className="text-[80px] lg:text-[120px] font-black leading-none tracking-tighter uppercase mb-2 select-none">
          {market.name.split(' ')[0]}
        </h1>
        <div className="flex items-center gap-6">
          <span className="text-4xl font-light text-white/90 font-mono tracking-tighter">
            ${formatCurrency(market.price, market.category === "Forex" ? 4 : 2)}
          </span>
          <span className={cn(
            "text-lg font-bold flex items-center gap-1",
            market.change24h >= 0 ? "text-dex-up" : "text-dex-down"
          )}>
            {market.change24h >= 0 ? "+" : ""}{market.change24h}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-6 pt-4 min-w-fit">
        <div className="flex flex-col">
          <span className="label-caps mb-1">24h Volume</span>
          <span className="text-xl font-black font-mono">
            ${market.volume24h > 1000000 
              ? (market.volume24h / 1000000).toFixed(1) + 'M' 
              : formatCurrency(market.volume24h, 0)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="label-caps mb-1">Open Interest</span>
          <span className="text-xl font-black font-mono">${(market.volume24h * 0.3 / 1000000).toFixed(1)}M</span>
        </div>
        <div className="flex flex-col">
          <span className="label-caps mb-1">Funding Rate</span>
          <span className="text-xl font-black font-mono text-blue-500">{market.fundingRate}%</span>
        </div>
        <div className="flex flex-col">
          <span className="label-caps mb-1">ARC Index</span>
          <span className="text-xl font-black font-mono">LIVE</span>
        </div>
      </div>
    </div>
  );
}
