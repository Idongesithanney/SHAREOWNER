import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { formatNaira } from '../lib/utils';
import { Transaction } from '../lib/types';
import { 
  ArrowLeft,
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp,
  Activity,
  Filter,
  ShoppingCart,
  Gift,
  RefreshCw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Link } from 'react-router-dom';

export default function Transactions() {
  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'DAILY_RETURN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED'>('ALL');

  useEffect(() => {
    if (!token || !user) return;
    
    setLoading(true);
    let unsubTxns = () => {};

    try {
      const txnsQuery = query(collection(db, 'transactions'), where('userId', '==', user.id));
      unsubTxns = onSnapshot(txnsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        data.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        setTransactions(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      });
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
    return () => {
      unsubTxns();
    };
  }, [user?.id, token]);

  if (loading || !user) return <div className="min-h-screen bg-[#020617]" />;

  const filteredTransactions = transactions.filter(t => {
    const typeMatch = filter === 'ALL' || t.type === filter;
    const statusMatch = statusFilter === 'ALL' || t.status === statusFilter;
    return typeMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-20">
      <header className="bg-[#020617]/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link to="/dashboard" className="p-2 mr-4 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-white font-black tracking-tight text-lg leading-tight uppercase">Transaction History</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Detailed Ledger</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'SHARE_PURCHASE', 'DAILY_RETURN'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  filter === f 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
            {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  statusFilter === s 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {s === 'ALL' ? 'ALL STATUSES' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-[10px] uppercase font-bold tracking-widest text-slate-500 flex flex-col items-center">
              <Activity className="h-12 w-12 text-slate-700 mb-4" />
              No transactions found for this filter.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {filteredTransactions.map((t) => (
                <li key={t.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/50 transition gap-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${
                      t.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' :
                      t.type === 'WITHDRAWAL' ? 'bg-red-500/10 text-red-500' :
                      t.type === 'DAILY_RETURN' ? 'bg-amber-500/10 text-amber-500' :
                      t.type === 'REFERRAL_BONUS' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {t.type === 'WITHDRAWAL' ? <ArrowUpRight className="h-6 w-6" /> : 
                       t.type === 'SHARE_PURCHASE' ? <ShoppingCart className="h-6 w-6" /> :
                       t.type === 'DAILY_RETURN' ? <TrendingUp className="h-6 w-6" /> :
                       t.type === 'REFERRAL_BONUS' ? <Gift className="h-6 w-6" /> :
                       <ArrowDownLeft className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-white uppercase">{t.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{t.memo}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center mt-1">
                        {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <p className={`text-xl font-black tracking-tight ${
                      t.type === 'DEPOSIT' ? 'text-emerald-500' :
                      t.type === 'WITHDRAWAL' ? 'text-red-500' :
                      t.type === 'DAILY_RETURN' ? 'text-amber-500' :
                      t.type === 'REFERRAL_BONUS' ? 'text-purple-500' :
                      'text-blue-500'
                    }`}>
                      {t.type === 'WITHDRAWAL' || t.type === 'SHARE_PURCHASE' ? '-' : '+'}{formatNaira(t.amount)}
                    </p>
                    <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 mt-1 rounded inline-block ${
                      t.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 
                      t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
