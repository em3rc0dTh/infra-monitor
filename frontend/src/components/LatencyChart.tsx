"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Props = {
  data: { label: string; ms: number | null }[];
};

export default function LatencyChart({ data }: Props) {
  // Filter out nulls for the chart
  const chartData = data.map(d => ({
    label: d.label,
    ms: d.ms === null ? 0 : d.ms
  }));

  return (
    <div className="w-full h-72 bg-white dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
       {/* Decorative gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent pointer-events-none opacity-40" />
      
      <div className="flex items-center justify-between mb-8">
         <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Historial de Latencia (ms)</h4>
         <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Últimos 100 registros</span>
         </div>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
          <XAxis 
             dataKey="label" 
             axisLine={false} 
             tickLine={false} 
             tick={{fontSize: 10, fill: '#94a3b8'}} 
             minTickGap={30}
          />
          <YAxis 
             axisLine={false} 
             tickLine={false} 
             tick={{fontSize: 10, fill: '#94a3b8'}} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: 'none', 
              borderRadius: '16px', 
              color: '#fff',
              fontSize: '12px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }}
            itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
            cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
          />
          <Area 
            type="monotone" 
            dataKey="ms" 
            stroke="#6366f1" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorMs)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
