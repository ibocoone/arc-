import { Wallet, Menu, ChevronDown, Activity, Globe, Droplets } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

export default function Header() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <header className="h-20 border-b border-white/10 bg-dex-bg flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">ARC PERP</span>
          <div className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-widest ml-1">
            Testnet
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
          <a href="#" className="text-white border-b-2 border-white pb-1 transition-colors">Trade</a>
          <a href="#" className="text-white/50 hover:text-white transition-colors">Dashboard</a>
          <a href="#" className="text-white/50 hover:text-white transition-colors">Markets</a>
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors flex items-center gap-1">
            <Droplets size={12} className="text-blue-500" />
            Faucet
          </a>
          <a href="#" className="text-white/50 hover:text-white transition-colors">Docs</a>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="label-caps !text-[9px]">Status</span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-dex-up animate-pulse" />
              12MS
            </div>
          </div>
          <div className="flex flex-col items-end border-l border-white/10 pl-6">
            <span className="label-caps !text-[9px]">Network</span>
            <div className="flex items-center gap-1 text-[11px] font-mono uppercase">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Mainnet
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected && (
            <div className="text-right hidden sm:block">
              <p className="label-caps !text-[8px] opacity-40">Wallet Connected</p>
              <p className="text-[11px] font-mono tracking-tighter">0x742d...4f2a</p>
            </div>
          )}
          
          <button 
            onClick={() => setIsConnected(!isConnected)}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all transform active:scale-95 border",
              isConnected 
                ? "border-white/20 hover:bg-white hover:text-black" 
                : "bg-white text-black hover:bg-gray-200 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
            )}
          >
            {isConnected ? "12,450 USDC" : "Connect Wallet"}
          </button>
        </div>

        <button className="md:hidden p-2 text-dex-muted hover:text-dex-text">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
