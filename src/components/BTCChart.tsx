import { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function BTCChart() {
  const [data, setData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState(43983.70);
  const [change, setChange] = useState(-64.13);
  const [changePercent, setChangePercent] = useState(-0.15);
  const [stats, setStats] = useState({ high: 44068.447, low: 43933.069 });

  useEffect(() => {
    // Generate initial live-style data
    const initialData = Array.from({ length: 30 }).map((_, i) => ({
      index: i,
      value: Math.random() * 50 + 20,
      type: Math.random() > 0.5 ? 'up' : 'down'
    }));
    setData(initialData);

    const interval = setInterval(() => {
      const isUp = Math.random() > 0.45;
      const priceMove = (Math.random() * 10) * (isUp ? 1 : -1);
      
      setCurrentPrice(prev => prev + priceMove);
      setChange(prev => prev + priceMove);
      
      setData((current) => {
        const newData = [...current.slice(1), { 
          index: current[current.length - 1].index + 1, 
          value: Math.random() * 50 + 20,
          type: isUp ? 'up' : 'down'
        }];
        return newData;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#080808] rounded-3xl border border-zinc-900/50 p-6 shadow-2xl vibrant-glow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Activity className="size-6 text-primary" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-none">LIVE Market</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">USD / GLOBAL INDEX</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">LIVE</span>
        </div>
      </div>

      {/* Price Section */}
      <div className="flex items-end justify-between mb-8">
        <div className="space-y-2">
          <div className="text-5xl md:text-6xl font-black text-white tracking-tighter">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center text-sm font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? <TrendingUp className="size-4 mr-1" /> : <TrendingDown className="size-4 mr-1" />}
              {change >= 0 ? '+' : ''}{change.toFixed(2)}
            </div>
            <div className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400">
              ({changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className="text-right space-y-1 hidden sm:block">
          <div className="flex items-center justify-end gap-3">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">HIGH:</span>
            <span className="text-xs text-white font-mono">${stats.high.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">LOW:</span>
            <span className="text-xs text-white font-mono">${stats.low.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-48 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar 
              dataKey="value" 
              radius={[4, 4, 4, 4]}
              minPointSize={5}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.type === 'up' ? '#10b981' : '#ef4444'} 
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
            <Tooltip cursor={false} content={() => null} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-zinc-900/50 grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">OPEN</div>
          <div className="text-xs text-white font-mono">$44,047.833</div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">VOL</div>
          <div className="text-xs text-white font-mono">1,292,440</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">LATENCY</div>
          <div className="text-[10px] text-green-500/80 italic font-medium">UPDATES EVERY 1.8S</div>
        </div>
      </div>
    </div>
  );
}

