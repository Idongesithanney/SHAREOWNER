import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ShareInvestment } from '../lib/types';
import { formatNaira } from '../lib/utils';
import { TrendingUp } from 'lucide-react';

export function EarningsChart({ shares }: { shares: ShareInvestment[] }) {
  const data = useMemo(() => {
    const projection = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      let dailyTotal = 0;
      shares.forEach(share => {
        if (share.status === 'ACTIVE' && share.daysRemaining > i) {
          dailyTotal += share.dailyIncome;
        }
      });
      
      projection.push({
        day: `Day ${i + 1}`,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        earnings: dailyTotal
      });
    }
    
    return projection;
  }, [shares]);

  // If no shares, we can show a flat zero line or a mock line to entice them, 
  // but showing zeroes reflects reality. Let's just show the calculated values.
  
  return (
    <div className="mt-8">
      <div className="flex items-center mb-4">
        <TrendingUp className="h-6 w-6 text-amber-500 mr-2" />
        <div>
          <h3 className="text-xl font-black text-white tracking-tight uppercase">30-Day Projection</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expected daily earnings</p>
        </div>
      </div>
      
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val, i) => i % 5 === 0 ? val : ''} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `₦${val.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
              itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
              formatter={(value: number) => [formatNaira(value), 'Earnings']}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="earnings" 
              stroke="#f59e0b" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorEarnings)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
