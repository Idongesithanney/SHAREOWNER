import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatNaira } from '../lib/utils';
import { motion } from 'motion/react';

export function InvestmentCalculator() {
  const [sharesValue, setSharesValue] = useState<string>('2000');

  const shares = Number(sharesValue) || 0;
  const investmentValue = shares * 5;
  const dailyIncome = investmentValue * 0.04;
  const maturityValue = shares * 50;

  return (
    <div className="mt-8">
      <div className="flex items-center mb-4">
        <Calculator className="h-6 w-6 text-amber-500 mr-2" />
        <div>
          <h3 className="text-xl font-black text-white tracking-tight uppercase">Investment Calculator</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Plan your projected returns</p>
        </div>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Number of Shares (Min: 2,000)</label>
            <input 
              type="number" 
              min="2000" 
              max="10000000" 
              value={sharesValue} 
              onChange={(e) => setSharesValue(e.target.value)} 
              className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl font-black tracking-tight focus:border-amber-500 focus:outline-none transition-colors" 
              placeholder="e.g. 2000" 
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {[2000, 5000, 10000, 20000, 50000].map(val => (
                <button
                  key={val}
                  onClick={() => setSharesValue(val.toString())}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white uppercase tracking-widest rounded transition-colors"
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
               <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Total Investment Required</p>
               <p className="text-xl font-black text-white tracking-tight">{formatNaira(investmentValue)}</p>
            </div>
          </div>
          
          <div className="flex flex-col justify-center space-y-4">
            <motion.div 
              key={sharesValue}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
            >
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1">Projected Daily Return (4%)</p>
              <h4 className="text-2xl font-black text-green-400 tracking-tight">+{formatNaira(dailyIncome)}</h4>
            </motion.div>
            
            <motion.div 
              key={sharesValue + '-maturity'}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
            >
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1">Total Expected at Maturity (180 Days)</p>
              <h4 className="text-2xl font-black text-amber-500 tracking-tight">{formatNaira(maturityValue)}</h4>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
