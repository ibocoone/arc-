import { Wallet, Menu, ChevronDown, Activity, Globe, Droplets, LogOut, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn, formatCurrency } from "../../lib/utils";
import { useUser } from "../../contexts/UserContext";
import { signIn, logOut } from "../../lib/firebase";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { user, userData, loading } = useUser();

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
          <a href="#" className="text-white/50 hover:text-white transition-colors uppercase flex items-center gap-2">
            <Sparkles size={10} className="text-dex-up" />
            AI Analytics
          </a>
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors flex items-center gap-1">
            <Droplets size={12} className="text-blue-500" />
            Faucet
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-6">
          <ThemeToggle />
          <div className="flex flex-col items-end border-l border-white/10 pl-6">
            <span className="label-caps !text-[9px]">Status</span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-dex-up animate-pulse" />
              12MS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right hidden sm:block">
              <p className="label-caps !text-[8px] opacity-40">Account</p>
              <p className="text-[11px] font-mono tracking-tighter text-white/70">{user.email?.split('@')[0]}</p>
            </div>
          )}
          
          <button 
            disabled={loading}
            onClick={user ? logOut : signIn}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all transform active:scale-95 border flex items-center gap-2",
              user 
                ? "border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 group" 
                : "bg-white text-black hover:bg-gray-200 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <>
                <span className="group-hover:hidden">{formatCurrency(userData?.balance || 0)} USDC</span>
                <span className="hidden group-hover:flex items-center gap-2">
                  <LogOut size={14} /> Log Out
                </span>
              </>
            ) : (
              "Login with Google"
            )}
          </button>
        </div>

        <button className="md:hidden p-2 text-dex-muted hover:text-dex-text">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
