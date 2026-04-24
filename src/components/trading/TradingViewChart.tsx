import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from 'lightweight-charts';
import { Market } from '../../types/trading';
import { cn } from '../../lib/utils';

interface TradingViewChartProps {
  market: Market;
}

// Map our timeframe labels to Binance kline intervals
const TF_MAP: Record<string, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d',
};

export default function TradingViewChart({ market }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [timeframe, setTimeframe] = React.useState('1h');

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cleanup previous
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; seriesRef.current = null; }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8E9299',
        fontSize: 10,
        fontFamily: 'Inter',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.2 } },
      crosshair: { mode: 1 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const binanceInterval = TF_MAP[timeframe] || '1h';

    if (!market.isRWA) {
      // 1. Load historical klines
      fetch(`https://api.binance.com/api/v3/klines?symbol=${market.id}&interval=${binanceInterval}&limit=300`)
        .then(r => r.json())
        .then((data: any[]) => {
          if (!Array.isArray(data)) return;
          const candles: CandlestickData[] = data.map(d => ({
            time: Math.floor(d[0] / 1000) as any,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
          }));
          series.setData(candles);
          chart.timeScale().fitContent();
        })
        .catch(err => console.error('Klines fetch error:', err));

      // 2. Live candle updates via Binance kline WS
      const wsSymbol = market.id.toLowerCase();
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@kline_${binanceInterval}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const k = msg.k;
        if (!k || !seriesRef.current) return;
        seriesRef.current.update({
          time: Math.floor(k.t / 1000) as any,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        });
      };
      ws.onerror = () => {};
    } else {
      // RWA assets — show a flat placeholder line with current price
      const now = Math.floor(Date.now() / 1000);
      const candles: CandlestickData[] = Array.from({ length: 50 }, (_, i) => {
        const t = now - (50 - i) * 3600;
        const base = market.price || 100;
        const jitter = (Math.random() - 0.5) * base * 0.005;
        return { time: t as any, open: base + jitter, high: base + Math.abs(jitter) * 2, low: base - Math.abs(jitter) * 2, close: base + jitter };
      });
      series.setData(candles);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; seriesRef.current = null; }
    };
  }, [market.id, timeframe]);

  return (
    <div className="w-full h-[480px] bg-dex-bg p-4 relative">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Timeframe selector */}
      <div className="absolute top-4 right-6 flex gap-1 z-20">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={cn(
              "px-2 py-1 text-[10px] font-black uppercase rounded transition-colors",
              timeframe === tf
                ? "bg-white text-black"
                : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10"
            )}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Market label */}
      <div className="absolute top-8 left-8 flex items-center gap-4 z-10 pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            {market.isRWA ? 'RWA Synthetic' : 'Live Market'}
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">{market.symbol}</h2>
            <div className={cn(
              "px-1.5 py-0.5 text-[9px] font-black rounded uppercase",
              market.isRWA ? "bg-yellow-500/20 text-yellow-400" : "bg-dex-up/20 text-dex-up"
            )}>
              {market.isRWA ? 'RWA' : 'Live'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
