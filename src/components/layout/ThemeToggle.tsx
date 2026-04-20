import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full hover:bg-white/5 transition-colors border border-white/10 group relative"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-white/60 group-hover:text-white" />
      ) : (
        <Moon size={16} className="text-dex-text/60 group-hover:text-dex-text" />
      )}
      <div className="absolute top-full mt-2 right-0 bg-dex-card border border-white/10 p-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <p className="text-[9px] font-black uppercase tracking-widest">
          {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </p>
      </div>
    </button>
  );
}
