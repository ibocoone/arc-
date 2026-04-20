import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { getTradingAdvice } from "../../lib/gemini";
import { Market } from "../../types/trading";
import { cn } from "../../lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatAssistantProps {
  currentMarket: Market;
}

export default function AIChatAssistant({ currentMarket }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your Arc AI assistant. How can I help you navigate the markets today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    const context = {
      asset: currentMarket.id,
      price: currentMarket.price,
      change: currentMarket.change24h,
      volume: currentMarket.volume24h
    };

    const advice = await getTradingAdvice(userMessage, context);
    
    setMessages(prev => [...prev, { role: "assistant", content: advice || "Error communicating with AI." }]);
    setIsTyping(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-[100] group"
      >
        <MessageCircle size={28} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-dex-up rounded-full border-2 border-dex-bg animate-pulse" />
        <div className="absolute right-full mr-4 bg-dex-card border border-white/10 p-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="text-[10px] font-black uppercase tracking-widest">Ask Arc AI</p>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-28 right-8 w-96 h-[550px] bg-dex-card border border-white/10 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Arc AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-dex-up animate-pulse" />
                    <span className="text-[9px] font-bold text-white/40 uppercase">Analyzing {currentMarket.id}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div 
                    className={cn(
                      "p-3 rounded-2xl text-[11px] leading-relaxed",
                      m.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white/5 border border-white/10 text-white/80 rounded-tl-none font-medium"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="markdown-body prose prose-invert prose-xs">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-white/20">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">AI is thinking...</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about technical analysis..."
                  className="w-full bg-dex-bg border border-white/20 rounded-xl py-3 px-4 pr-12 text-[11px] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button 
                  onClick={handleSend}
                  disabled={isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-400 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[8px] text-white/20 text-center mt-3 uppercase font-bold tracking-tighter">
                AI can make mistakes. Always do your own research.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
