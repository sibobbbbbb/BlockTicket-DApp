import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';

export default function OracleFeed() {
  const [rate, setRate] = useState<number>(45250000);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = Math.floor(Math.random() * 200000) - 100000;
      setRate(prev => prev + fluctuation);
      setLastUpdate(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-2xl z-50 w-64 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <TrendingUp size={12} /> Oracle Live Feed
        </h3>
        <div className="flex items-center gap-1">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] text-slate-500">Online</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
            <p className="text-xs text-slate-500">ETH / IDR</p>
            <p className="text-lg font-mono font-bold text-cyan-400">
                Rp {rate.toLocaleString('id-ID')}
            </p>
        </div>
        <RefreshCw size={16} className="text-slate-600 animate-spin-slow" />
      </div>
      
      <p className="text-[10px] text-slate-600 mt-2 text-right">
        Last Sync: {lastUpdate}
      </p>
    </div>
  );
}