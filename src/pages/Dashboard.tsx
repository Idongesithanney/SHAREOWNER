import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { formatNaira } from '../lib/utils';
import { ShareInvestment, Transaction } from '../lib/db';
import { 
  LogOut, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Copy, 
  Clock, 
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, logout, refreshUser } = useAuth();
  const [shares, setShares] = useState<ShareInvestment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  
  // Form States
  const [amount, setAmount] = useState('');
  const [shareCount, setShareCount] = useState('2000');
  const [formLoading, setFormLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares);
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      if (res.ok) {
        setShowDeposit(false);
        setAmount('');
        await refreshUser();
        await fetchData();
      } else {
        alert('Deposit failed');
      }
    } catch (err) {
    } finally {
      setFormLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      if (res.ok) {
        setShowWithdraw(false);
        setAmount('');
        await refreshUser();
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Withdraw failed');
      }
    } catch (err) {
    } finally {
      setFormLoading(false);
    }
  };

  const handleBuyShares = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/shares/buy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sharesAmount: Number(shareCount) })
      });
      if (res.ok) {
        setShowBuy(false);
        setShareCount('2000');
        await refreshUser();
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Purchase failed');
      }
    } catch (err) {
    } finally {
      setFormLoading(false);
    }
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(user?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-[#0a192f]" />;

  const activeShares = shares.filter(s => s.status === 'ACTIVE');
  const totalDailyIncome = activeShares.reduce((acc, curr) => acc + curr.dailyIncome, 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-20">
      {/* Header */}
      <header className="bg-[#020617]/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-black font-sans">S</span>
            </div>
            <div>
              <h1 className="text-white font-black tracking-tight text-lg leading-tight italic">SHAREOWNER <span className="text-amber-500">LTD</span></h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Verified Investor: {user?.name}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 border border-amber-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Wallet className="h-24 w-24 text-slate-900" />
            </div>
            <p className="text-[10px] font-bold tracking-widest text-slate-900 mb-1 uppercase opacity-80">Withdrawable Balance</p>
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">
              {formatNaira(user?.balance || 0)}
            </h2>
            <div className="flex space-x-3 relative z-10">
              <button 
                onClick={() => setShowDeposit(true)}
                className="flex-1 bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition active:scale-95"
              >
                <ArrowDownLeft className="h-5 w-5 mr-1" /> DEPOSIT
              </button>
              <button 
                onClick={() => setShowWithdraw(true)}
                className="flex-1 bg-slate-900 text-white font-black py-4 rounded-xl flex items-center justify-center hover:bg-slate-800 transition active:scale-95 border border-slate-700"
              >
                <ArrowUpRight className="h-5 w-5 mr-1" /> WITHDRAW
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl"
          >
            <p className="text-[10px] text-slate-400 mb-1 font-bold tracking-widest uppercase">Daily Income</p>
            <h2 className="text-4xl font-black text-amber-500 mb-6 tracking-tight">
              +{formatNaira(totalDailyIncome)}
            </h2>
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center uppercase tracking-wider">
              <Activity className="h-4 w-4 mr-1 animate-pulse" /> Live 4% Daily Yield Active
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl"
          >
            <p className="text-[10px] text-slate-400 mb-1 font-bold tracking-widest uppercase">Total Earnings (All Time)</p>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2">
              {formatNaira(user?.totalEarnings || 0)}
            </h2>
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-4">*Includes daily returns and referral bonuses</p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Your Referral Code</p>
                <p className="text-sm font-black tracking-widest font-mono text-amber-500">{user?.referralCode}</p>
              </div>
              <button onClick={copyReferral} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition text-white">
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Investment Center */}
        <div className="mt-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">My Active Shares</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Track your investment portfolio maturity</p>
            </div>
            <button 
              onClick={() => setShowBuy(true)}
              className="px-4 py-3 bg-amber-500 text-black rounded-lg font-black hover:bg-amber-400 transition tracking-widest text-xs uppercase"
            >
              + PURCHASE SHARES
            </button>
          </div>

          {shares.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4 font-bold uppercase tracking-widest text-xs">You don't have any active share investments yet.</p>
              <button onClick={() => setShowBuy(true)} className="px-6 py-3 bg-amber-500 text-black font-black uppercase tracking-widest text-xs rounded-full">Start Investing</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shares.map((share, i) => (
                <motion.div 
                  key={share.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
                      {share.status}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> {share.daysRemaining} days left
                    </span>
                  </div>
                  <h4 className="text-3xl font-black text-white mb-1 tracking-tight">{share.sharesAmount.toLocaleString()} <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Shares</span></h4>
                  <div className="text-xs uppercase font-bold text-slate-400 mb-4 tracking-widest">Value: {formatNaira(share.investmentValue)}</div>
                  
                  <div className="bg-slate-800/30 rounded-xl p-3 space-y-2 border border-slate-700/50">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Yielding (Daily)</span>
                      <span className="text-amber-500">+{formatNaira(share.dailyIncome)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Maturity Target</span>
                      <span className="text-white">{formatNaira(share.maturityValue)}</span>
                    </div>
                  </div>
                  {/* Progress bar simulation */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${((180 - share.daysRemaining) / 180) * 100}%` }}></div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <h3 className="text-xl font-black uppercase tracking-tight text-white mb-4">Recent Transactions</h3>
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-[10px] uppercase font-bold tracking-widest text-slate-500">No transactions yet.</div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {transactions.slice(0, 10).map((t) => (
                  <li key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${
                        t.type === 'DEPOSIT' || t.type === 'DAILY_RETURN' || t.type === 'REFERRAL_BONUS' ? 'bg-amber-500/10 text-amber-500' :
                        t.type === 'WITHDRAWAL' ? 'bg-slate-700/50 text-white' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {t.type === 'WITHDRAWAL' ? <ArrowUpRight className="h-5 w-5" /> : 
                         t.type === 'SHARE_PURCHASE' ? <TrendingUp className="h-5 w-5" /> :
                         <ArrowDownLeft className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-white">{t.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-black tracking-tight ${
                        t.type === 'DEPOSIT' || t.type === 'DAILY_RETURN' || t.type === 'REFERRAL_BONUS' ? 'text-amber-500' : 'text-white'
                      }`}>
                        {t.type === 'WITHDRAWAL' || t.type === 'SHARE_PURCHASE' ? '-' : '+'}{formatNaira(t.amount)}
                      </p>
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${
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
        </div>
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
          <a href="#whatsapp" className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-110 transition">
            <span className="font-bold">WA</span>
          </a>
          <a href="#telegram" className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-110 transition">
            <span className="font-bold">TG</span>
          </a>
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {showDeposit && (
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight text-white">DEPOSIT FUNDS</h3>
                <button onClick={() => setShowDeposit(false)} className="text-slate-500 hover:text-white transition-colors"><XCircle className="h-6 w-6" /></button>
              </div>
              <form onSubmit={handleDeposit}>
                <div className="mb-8">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Amount (NGN)</label>
                  <input type="number" required min="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl font-black tracking-tight focus:border-amber-500 focus:outline-none transition-colors" placeholder="100,000" />
                </div>
                <button type="submit" disabled={formLoading} className="w-full bg-amber-500 text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-amber-400 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">Proceed to Payment</button>
                <p className="text-[10px] uppercase font-bold tracking-widest text-center text-slate-500 mt-6">Simulated instant funding for this environment.</p>
              </form>
            </motion.div>
          </div>
        )}

        {showWithdraw && (
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-50 flex justify-center items-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight text-white">WITHDRAW FUNDS</h3>
                <button onClick={() => setShowWithdraw(false)} className="text-slate-500 hover:text-white transition-colors"><XCircle className="h-6 w-6" /></button>
              </div>
              <form onSubmit={handleWithdraw}>
                <div className="mb-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Amount (NGN)</label>
                  <input type="number" required min="5000" max={user?.balance} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl font-black tracking-tight focus:border-amber-500 focus:outline-none transition-colors" placeholder="5,000" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8 text-right">Available: <span className="font-black text-amber-500">{formatNaira(user?.balance || 0)}</span></p>
                <button type="submit" disabled={formLoading} className="w-full bg-white text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-200 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">Request Withdrawal</button>
              </form>
            </motion.div>
          </div>
        )}

        {showBuy && (
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-50 flex justify-center items-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md my-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight text-white">PURCHASE SHARES</h3>
                <button onClick={() => setShowBuy(false)} className="text-slate-500 hover:text-white transition-colors"><XCircle className="h-6 w-6" /></button>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl mb-8">
                <p className="text-sm text-blue-300 font-bold tracking-wide">1 Share = ₦5. Minimum entry is 2,000 shares.</p>
                <p className="text-xs text-blue-400 mt-2 font-bold uppercase tracking-widest">Earn 4% daily on your capital for 180 days.</p>
              </div>
              <form onSubmit={handleBuyShares}>
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Number of Shares</label>
                  <input type="number" required min="2000" max="10000000" value={shareCount} onChange={(e) => setShareCount(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl font-black tracking-tight focus:border-amber-500 focus:outline-none transition-colors" />
                </div>
                
                <div className="bg-slate-800/50 rounded-2xl p-5 mb-8 space-y-4 border border-slate-700">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Execution Price:</span>
                    <span className="text-white">{formatNaira(Number(shareCount || 0) * 5)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Daily Return Forecast:</span>
                    <span className="text-amber-500">+{formatNaira(Number(shareCount || 0) * 5 * 0.04)}/day</span>
                  </div>
                  <div className="border-t border-slate-700 pt-4 flex justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-slate-400">Available Balance:</span>
                    <span className={user?.balance && user.balance < Number(shareCount)*5 ? "text-red-400" : "text-emerald-400"}>{formatNaira(user?.balance || 0)}</span>
                  </div>
                </div>

                <button type="submit" disabled={formLoading || (user?.balance || 0) < Number(shareCount)*5} className="w-full bg-amber-500 text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-amber-400 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                  {(user?.balance || 0) < Number(shareCount)*5 ? 'Insufficient Balance' : 'Confirm Purchase'}
                </button>
                {(user?.balance || 0) < Number(shareCount)*5 && (
                  <button type="button" onClick={() => { setShowBuy(false); setShowDeposit(true); }} className="w-full mt-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors">
                    Deposit Funds First
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
