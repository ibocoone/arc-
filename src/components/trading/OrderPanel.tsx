import { useState, useEffect } from "react";
import { OrderSide, OrderType, Market } from "../../types/trading";
import { cn, formatCurrency } from "../../lib/utils";
import { ShieldCheck, TrendingDown, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../../contexts/UserContext";

interface OrderPanelProps {
  market: Market;
}

export default function OrderPanel({ market }: OrderPanelProps) {
  const { user, userData } = useUser();
  const [side, setSide] = useState<OrderSide>(OrderSide.LONG);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.MARKET);
  const [leverage, setLeverage] = useState(1);
  const [size, setSize] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [trailingCallback, setTrailingCallback] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when wallet connects
  useEffect(() => {
    if (user) setError(null);
  }, [user]);

  const collars = [2, 5, 10, 20, 50, 100];

  const handleOpenOrder = async () => {
    if (!user) {
      setError("Please connect your wallet to trade");
      return;
    }

    const tradeSize = parseFloat(size);
    if (!tradeSize || tradeSize <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const balance = userData?.balance ?? 10000; // default 10k if doc not loaded yet
    if (tradeSize > balance) {
      setError(`Insufficient balance (${balance.toFixed(2)} USDC available)`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Send wallet address as auth token
      const response = await fetch('/api/trading/open-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.address}`
        },
        body: JSON.stringify({
          marketId: market.id,
          side,
          size: tradeSize,
          leverage,
          orderType,
          limitPrice: orderType === OrderType.MARKET ? null : parseFloat(limitPrice),
          stopLoss: stopLoss ? parseFloat(stopLoss) : null,
          takeProfit: takeProfit ? parseFloat(takeProfit) : null
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order failed");

      setSize("");
      alert("Order executed securely by Arc Server!");
    } catch (err: any) {
      console.error("Order failed:", err);
      setError(err.message || "Failed to execute order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-80 border-l border-white/10 bg-dex-bg flex flex-col h-full overflow-y-auto">
      <div className="flex p-4 gap-2">
        <button
          onClick={() => setSide(OrderSide.LONG)}
          className={cn(
            "flex-1 py-3 text-xs font-black uppercase transition-all rounded shadow-lg",
            side === OrderSide.LONG 
              ? "bg-dex-up text-black shadow-dex-up/20" 
              : "bg-transparent border border-white/10 text-white/40 hover:text-white"
          )}
        >
          Long
        </button>
        <button
          onClick={() => setSide(OrderSide.SHORT)}
          className={cn(
            "flex-1 py-3 text-xs font-black uppercase transition-all rounded shadow-lg",
            side === OrderSide.SHORT 
              ? "bg-dex-down text-black shadow-dex-down/20" 
              : "bg-transparent border border-white/10 text-white/40 hover:text-white"
          )}
        >
          Short
        </button>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-[10px] text-red-500 font-bold uppercase">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 border border-white/10 p-1">
          {Object.values(OrderType).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={cn(
                "py-2 text-[9px] font-black uppercase tracking-tighter transition-all whitespace-nowrap",
                orderType === type ? "bg-white text-black" : "text-white/40 hover:text-white"
              )}
            >
              {type.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="label-caps">Amount</span>
            <a 
              href="https://faucet.circle.com" 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
            >
              Request USDC
            </a>
          </div>
          <div className="relative">
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent border border-white/20 rounded py-4 px-4 text-2xl font-mono focus:outline-none focus:border-white transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-white/30 uppercase tracking-widest">
              USDC
            </div>
          </div>
        </div>

        {(orderType === OrderType.LIMIT || orderType === OrderType.STOP_LIMIT) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-col gap-6 overflow-hidden"
          >
            {orderType === OrderType.STOP_LIMIT && (
              <div className="space-y-2">
                <span className="label-caps">Stop Price</span>
                <div className="relative">
                  <input
                    type="number"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    placeholder={market.price.toString()}
                    className="w-full bg-transparent border border-white/20 rounded py-3 px-4 text-lg font-mono focus:outline-none focus:border-white transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase">
                    Trigger
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <span className="label-caps">Limit Price</span>
              <div className="relative">
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={market.price.toString()}
                  className="w-full bg-transparent border border-white/20 rounded py-3 px-4 text-lg font-mono focus:outline-none focus:border-white transition-colors"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase">
                  Price
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="label-caps text-dex-down">Stop Loss</span>
                <div className="relative">
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent border border-white/20 rounded py-3 px-4 text-sm font-mono focus:outline-none focus:border-dex-down transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <span className="label-caps text-dex-up">Take Profit</span>
                <div className="relative">
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent border border-white/20 rounded py-3 px-4 text-sm font-mono focus:outline-none focus:border-dex-up transition-colors"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {orderType === OrderType.TRAILING_STOP && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-col gap-6 overflow-hidden"
          >
            <div className="space-y-2">
              <span className="label-caps">Callback Rate</span>
              <div className="relative">
                <input
                  type="number"
                  value={trailingCallback}
                  onChange={(e) => setTrailingCallback(e.target.value)}
                  placeholder="2.0"
                  className="w-full bg-transparent border border-white/20 rounded py-3 px-4 text-lg font-mono focus:outline-none focus:border-white transition-colors"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase">
                  %
                </div>
              </div>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded flex items-center gap-3">
              <TrendingDown className="w-4 h-4 text-white/40" />
              <p className="text-[9px] text-white/40 uppercase font-bold leading-tight">
                Trailing stop orders follow the {side === OrderSide.LONG ? "high" : "low"} price by the callback rate.
              </p>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="label-caps">Leverage</span>
            <span className="text-xs font-black text-blue-500 font-mono">{leverage}x</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {collars.map((l) => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={cn(
                  "py-2 text-[10px] font-black uppercase transition-all border",
                  leverage === l 
                    ? "bg-white text-black border-white" 
                    : "border-white/10 text-white/40 hover:border-white/30 hover:text-white"
                )}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 py-4 border-t border-white/5">
          <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
            <span className="text-white/40 font-bold">Liquidation Price</span>
            <span className="font-mono text-white">
              {size ? formatCurrency(market.price * (side === OrderSide.LONG ? 0.92 : 1.08), 2) : "0.00"}
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
            <span className="text-white/40 font-bold">Funding Rate</span>
            <span className="font-mono text-dex-up">0.012%</span>
          </div>
          <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
            <span className="text-white/40 font-bold">Max Slippage</span>
            <span className="font-mono text-white">0.1%</span>
          </div>
        </div>

        <button
          disabled={isSubmitting}
          onClick={handleOpenOrder}
          className={cn(
            "w-full py-5 rounded text-black font-black uppercase tracking-tighter text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2",
            isSubmitting && "opacity-50 cursor-not-allowed",
            !user
              ? "bg-white text-black hover:bg-gray-200"
              : side === OrderSide.LONG
                ? "bg-dex-up hover:bg-dex-up/90 shadow-dex-up/20"
                : "bg-dex-down hover:bg-dex-down/90 shadow-dex-down/20"
          )}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : !user ? (
            "Connect Wallet"
          ) : side === OrderSide.LONG ? (
            "Open Long"
          ) : (
            "Open Short"
          )}
        </button>

        <div className="mt-4 flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg group hover:bg-white/10 transition-colors">
          <ShieldCheck className="text-blue-500 w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-[10px] text-white/50 leading-relaxed uppercase font-bold tracking-tight">
            Orders are executed on <span className="text-white font-black">Arc Testnet</span> — paper trading only. No real funds at risk.
          </p>
        </div>
      </div>
    </div>
  );
}
