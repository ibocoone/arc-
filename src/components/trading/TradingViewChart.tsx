import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { Market } from '../../types/trading';
import { cn } from '../../lib/utils';

interface TradingViewChartProps {
  market: Market;
}

export default function TradingViewChart({ market }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval] = React.useState('1m');

  const timeframes = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '1h', value: '1h' },
    { label: '1d', value: '1d' },
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8E9299',
        fontSize: 10,
        fontFamily: 'Inter',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
    });

    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Fetch real historical klines from Binance
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${market.id}&interval=${interval}&limit=200`);
        const data = await response.json();
        
        const formattedData: CandlestickData[] = data.map((d: any) => ({
          time: (d[0] / 1000) as any,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        candlestickSeries.setData(formattedData);
        chart.timeScale().fitContent();
      } catch (error) {
        console.error("Failed to fetch klines:", error);
      }
    };

    fetchHistoricalData();
    
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [market, interval]);

  return (
    <div className="w-full h-[480px] bg-dex-bg p-4 relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Timeframe Selector */}
      <div className="absolute top-4 right-20 flex gap-1 z-20">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setInterval(tf.value)}
            className={cn(
              "px-2 py-1 text-[10px] font-black uppercase rounded transition-all transition-colors",
              interval === tf.value ? "bg-white text-black" : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="absolute top-8 left-8 flex items-center gap-4 z-10 pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Live Market</span>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">{market.id}</h2>
            <div className="px-1.5 py-0.5 bg-dex-up/20 text-dex-up text-[9px] font-black rounded uppercase">Live</div>
          </div>
        </div>
      </div>
    </div>
  );
}
