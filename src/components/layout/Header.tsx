import { useState } from "react";
import { Menu, Droplets, LogOut, Sparkles, Wallet, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useUser } from "../../contexts/UserContext";
import { shortenAddress } from "../../lib/wallet";
import ThemeToggle from "./ThemeToggle";

export default function Header({ onDashboard }: { onDashboard?: () => void }) {
  const { user, userData, loading, error, isWrongNetwork, connect, disconnect, switchNetwork } = useUser();
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    if (user) disconnect();
    else await connect();
  };

  return (
    <>
      {/* Wrong network banner */}
      {user && isWrongNetwork && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-400 text-[11px] font-bold uppercase tracking-widest">
            <AlertTriangle size={14} />
            Wrong network — please switch to Arc Testnet
          </div>
          <button
            onClick={switchNetwork}
            className="px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase rounded hover:bg-yellow-400 transition-colors"
          >
            Switch Network
          </button>
        </div>
      )}

      <header className="h-20 border-b border-white/10 bg-dex-bg flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-full" />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase">ARC PERP</span>
            <div className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-widest ml-1">
              Testnet
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
            <a href="#" className="text-white border-b-2 border-white pb-1">Trade</a>
            <button onClick={onDashboard} className="text-white/50 hover:text-white transition-colors">Dashboard</button>
            <a href="#" className="text-white/50 hover:text-white transition-colors flex items-center gap-2">
              <Sparkles size={10} className="text-dex-up" />
              AI Analytics
            </a>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
              className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
            >
              <Droplets size={12} className="text-blue-500" />
              Faucet
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-6">
            <ThemeToggle />
            {/* Network indicator */}
            <div className="flex flex-col items-end border-l border-white/10 pl-6">
              <span className="label-caps !text-[9px]">Network</span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isWrongNetwork ? "bg-yellow-500 animate-pulse" : "bg-dex-up animate-pulse"
                )} />
                {isWrongNetwork ? (
                  <span className="text-yellow-400 text-[10px] font-bold">Wrong Network</span>
                ) : (
                  <span>Arc Testnet</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Wallet address */}
            {user && (
              <div className="text-right hidden sm:block">
                <p className="label-caps !text-[8px] opacity-40">Wallet</p>
                <p className="text-[11px] font-mono tracking-tighter text-white/70">
                  {shortenAddress(user.address)}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-400 text-[10px] font-bold max-w-[180px] text-right">{error}</p>
            )}

            {/* Connect / Disconnect button */}
            <button
              disabled={loading}
              onClick={handleClick}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className={cn(
                "px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all transform active:scale-95 border flex items-center gap-2 min-w-[160px] justify-center",
                loading && "opacity-60 cursor-not-allowed",
                user
                  ? hovered
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-white/20 text-white"
                  : "bg-white text-black hover:bg-gray-200 border-white shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : user ? (
                hovered ? (
                  <>
                    <LogOut size={14} />
                    <span>Disconnect</span>
                  </>
                ) : (
                  <>
                    <Wallet size={12} />
                    <span>{formatCurrency(userData?.balance || 0)} USDC</span>
                  </>
                )
              ) : (
                <>
                  <Wallet size={14} />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          </div>

          <button className="md:hidden p-2 text-dex-muted hover:text-dex-text">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>
    </>
  );
}
