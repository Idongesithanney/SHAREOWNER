import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { formatNaira, formatDate, formatProjectedDate } from '../lib/utils';
import { ShareInvestment, Transaction } from '../lib/types';
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
  Activity,
  Mail,
  Share2,
  AlertCircle,
  Search
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { InvestmentCalculator } from '../components/InvestmentCalculator';
import { EarningsChart } from '../components/EarningsChart';

import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, token, logout, refreshUser } = useAuth();
  const [shares, setShares] = useState<ShareInvestment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [showBuy, setShowBuy] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  
  // Form States
  const [amount, setAmount] = useState('');
  const [shareCount, setShareCount] = useState('2000');
  const [formLoading, setFormLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txnSearchQuery, setTxnSearchQuery] = useState('');

  useEffect(() => {
    if (!token || !user) return;
    
    setLoading(true);
    let unsubShares = () => {};
    let unsubTxns = () => {};

    try {
      const sharesQuery = query(collection(db, 'shares'), where('userId', '==', user.id));
      unsubShares = onSnapshot(sharesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShareInvestment[];
        setShares(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'shares');
      });

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
      unsubShares();
      unsubTxns();
    };
  }, [user?.id, token]);

  const filteredTransactions = transactions.filter((t) => {
    if (!txnSearchQuery) return true;
    const query = txnSearchQuery.toLowerCase().trim();
    
    const memoMatch = t.memo?.toLowerCase().includes(query);
    const typeMatch = t.type?.toLowerCase().replace('_', ' ').includes(query);
    const statusMatch = t.status?.toLowerCase().includes(query);

    const dateFormatted = t.createdAt ? formatDate(t.createdAt).toLowerCase() : '';
    const dateLocale = t.createdAt ? new Date(t.createdAt).toLocaleDateString().toLowerCase() : '';
    const dateMatch = dateFormatted.includes(query) || dateLocale.includes(query);

    return !!(memoMatch || typeMatch || statusMatch || dateMatch);
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);
    try {
      const depositAmount = Number(amount);
      const userRef = doc(db, 'users', user.id);
      
      const newTxnRef = doc(collection(db, 'transactions'));
      await setDoc(newTxnRef, {
        userId: user.id,
        type: 'DEPOSIT',
        amount: depositAmount,
        status: 'COMPLETED',
        createdAt: serverTimestamp(),
        memo: 'Wallet Funded (Automated gateway simulation)'
      });

      await updateDoc(userRef, { balance: increment(depositAmount) });

      setShowDeposit(false);
      setAmount('');
      await refreshUser();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'deposit');
    } finally {
      setFormLoading(false);
    }
  };

  const handleWithdrawRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    if (!user) return;
    const withdrawAmount = Number(amount);
    if (user.balance < withdrawAmount) {
      setWithdrawError('Insufficient balance.');
      return;
    }
    setShowWithdrawConfirm(true);
  };

  const handleWithdraw = async () => {
    if (!user) return;
    setFormLoading(true);
    try {
      const withdrawAmount = Number(amount);
      if (user.balance < withdrawAmount) throw new Error('Insufficient balance');

      const userRef = doc(db, 'users', user.id);
      
      const newTxnRef = doc(collection(db, 'transactions'));
      await setDoc(newTxnRef, {
        userId: user.id,
        type: 'WITHDRAWAL',
        amount: withdrawAmount,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        memo: 'Bank Withdrawal Request'
      });

      await updateDoc(userRef, { balance: increment(-withdrawAmount) });

      setShowWithdrawConfirm(false);
      setShowWithdraw(false);
      setAmount('');
      await refreshUser();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'withdraw');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBuyRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amountShares = Number(shareCount);
    const investmentValue = amountShares * 5;
    if (user.balance < investmentValue || amountShares < 2000) return;
    
    setShowBuyConfirm(true);
  };

  const handleBuyShares = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);
    try {
      const amountShares = Number(shareCount);
      if (amountShares < 2000 || amountShares > 10000000) throw new Error('Invalid amount');
      
      const investmentValue = amountShares * 5;
      if (user.balance < investmentValue) throw new Error('Insufficient balance');

      const dailyIncome = investmentValue * 0.04;
      
      const userRef = doc(db, 'users', user.id);
      const newShareRef = doc(collection(db, 'shares'));
      
      await setDoc(newShareRef, {
        userId: user.id,
        sharesAmount: amountShares,
        investmentValue,
        dailyIncome,
        maturityValue: amountShares * 50,
        daysRemaining: 180,
        createdAt: serverTimestamp(),
        status: 'ACTIVE'
      });

      const newTxnRef = doc(collection(db, 'transactions'));
      await setDoc(newTxnRef, {
        userId: user.id,
        type: 'SHARE_PURCHASE',
        amount: investmentValue,
        status: 'COMPLETED',
        createdAt: serverTimestamp(),
        memo: `Purchased ${amountShares.toLocaleString()} Shares`
      });

      await updateDoc(userRef, { balance: increment(-investmentValue) });

      // Update global states
      const statsRef = doc(db, 'stats', 'global');
      await updateDoc(statsRef, {
        companyReserve: increment(investmentValue)
      }).catch(() => {}); // ignore if it doesn't exist yet for sandbox

      setShowBuyConfirm(false);
      setShowBuy(false);
      setShareCount('2000');
      await refreshUser();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'buy_shares');
    } finally {
      setFormLoading(false);
    }
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(user?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !user) return <div className="min-h-screen bg-[#020617]" />;

  const activeShares = shares.filter(s => s.status === 'ACTIVE');
  const totalDailyIncome = activeShares.reduce((acc, curr) => acc + curr.dailyIncome, 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-20">
      {/* Header */}
      <header className="bg-[#020617]/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Shareowner Schema" className="h-10 w-10 bg-white rounded-lg object-contain p-1" />
            <div>
              <h1 className="text-white font-black tracking-tight text-lg leading-tight italic hidden sm:block">SHAREOWNER <span className="text-amber-500">LTD</span></h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Verified Investor: {user?.name}</p>
            </div>
          </Link>
          <button 
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold uppercase tracking-widest text-xs transition-all duration-200 active:scale-95 shadow-lg"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
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
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex justify-between items-center mb-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Your Referral Code</p>
                <p className="text-sm font-black tracking-widest font-mono text-amber-500">{user?.referralCode}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyReferral} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition text-white" title="Copy Code">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <a href={`mailto:?subject=Join me on SHAREOWNER LTD&body=Sign up using my referral code: ${user?.referralCode}`} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition text-white" title="Share via Email">
                  <Mail className="h-4 w-4" />
                </a>
                <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'SHAREOWNER LTD',
                      text: `Sign up using my referral code: ${user?.referralCode}`,
                    }).catch((err) => {
                      if (err.name !== 'AbortError' && !err.message?.toLowerCase().includes('cancel') && !err.message?.toLowerCase().includes('notallowed')) {
                        console.error('Error sharing:', err);
                      }
                    });
                  } else {
                    window.open(`https://twitter.com/intent/tweet?text=Sign up using my referral code: ${user?.referralCode}`, '_blank');
                  }
                 }} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition text-white" title="Share">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Link to="/referrals" className="text-[10px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors inline-block pt-1">
              VIEW REFERRALS TREE →
            </Link>
          </motion.div>
        </div>

        {/* 30-Day Earnings Projection */}
        <EarningsChart shares={shares} />

        {/* Investment Calculator */}
        <InvestmentCalculator />

        {/* Investment Center */}
        <div className="mt-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase flex items-center">
                My Active Shares
                {shares.some(s => s.daysRemaining <= 7 && s.status === 'ACTIVE') && (
                  <span className="ml-3 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest flex items-center animate-pulse">
                    <AlertCircle className="h-3 w-3 mr-1" /> Action Required Soon
                  </span>
                )}
              </h3>
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
                    {share.status === 'ACTIVE' ? (
                      <span className="bg-amber-500/20 border border-amber-500/30 text-amber-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center">
                        <Activity className="h-3 w-3 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Matured
                      </span>
                    )}

                    {share.status === 'ACTIVE' && share.daysRemaining <= 7 ? (
                      <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest flex items-center shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                        <AlertCircle className="h-3 w-3 mr-1" /> {share.daysRemaining} days left!
                      </span>
                    ) : share.status === 'ACTIVE' ? (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> {share.daysRemaining} days left
                      </span>
                    ) : null}
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
                  <div className="bg-slate-800/30 rounded-xl p-3 space-y-2 border border-slate-700/50 mt-4">
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500 flex-shrink-0">Invested On</span>
                      <span className="text-white text-right truncate ml-2">{formatDate(share.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500 flex-shrink-0">Maturity Date</span>
                      <span className="text-white text-right truncate ml-2">{formatProjectedDate(share.createdAt, 180)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="flex justify-between text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-1.5">
                      <span className={share.status === 'MATURED' || share.daysRemaining <= 0 ? "text-green-400" : "text-slate-400"}>
                        {share.status === 'MATURED' || share.daysRemaining <= 0 ? "100% Complete" : "Maturity Progress"}
                      </span>
                      <span className={share.status === 'MATURED' || share.daysRemaining <= 0 ? "text-green-400" : "text-amber-500 font-mono"}>
                        {share.status === 'MATURED' || share.daysRemaining <= 0 ? '180 / 180 Days' : `${180 - share.daysRemaining} / 180 Days`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div className={`h-full rounded-full transition-all duration-1000 ${share.status === 'MATURED' || share.daysRemaining <= 0 ? 'bg-green-400' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, Math.max(0, ((180 - share.daysRemaining) / 180) * 100))}%` }}></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Recent Transactions</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Filter by memo description, type, status, or date</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={txnSearchQuery}
                  onChange={(e) => setTxnSearchQuery(e.target.value)}
                  placeholder="Search date, type, status, or memo..."
                  className="block w-full sm:w-72 bg-slate-950/50 border border-slate-800 rounded-2xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                />
                {txnSearchQuery && (
                  <button
                    onClick={() => setTxnSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Link to="/transactions" className="text-[10px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors whitespace-nowrap text-center sm:text-right">
                VIEW ALL →
              </Link>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-[10px] uppercase font-bold tracking-widest text-slate-500">
                {txnSearchQuery ? 'No matching transactions found.' : 'No transactions yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {filteredTransactions.slice(0, 10).map((t) => (
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
                        {t.memo && (
                          <p className="text-[10px] text-slate-400 capitalize mt-0.5 font-medium">{t.memo}</p>
                        )}
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
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
          <a href="https://wa.me/2349039163076" target="_blank" rel="noopener noreferrer" className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-110 transition">
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
                <h3 className="text-2xl font-black tracking-tight text-white">{showWithdrawConfirm ? 'CONFIRM WITHDRAWAL' : 'WITHDRAW FUNDS'}</h3>
                <button onClick={() => { setShowWithdraw(false); setShowWithdrawConfirm(false); }} className="text-slate-500 hover:text-white transition-colors"><XCircle className="h-6 w-6" /></button>
              </div>
              
              {!user.bankLinked ? (
                <div className="text-center space-y-6 py-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
                    <p className="text-sm font-bold uppercase tracking-wider mb-2">No Bank Account Linked</p>
                    <p className="text-xs text-slate-300">To comply with security and regulatory guidelines, you must bind your real bank account details in your profile before requesting any payouts.</p>
                  </div>
                  <Link
                    to="/profile"
                    className="block w-full text-center bg-amber-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-amber-400 transition transform hover:scale-[1.01] active:scale-95 text-xs"
                  >
                    Go Bind Bank Details →
                  </Link>
                </div>
              ) : showWithdrawConfirm ? (
                <div className="space-y-6">
                  <div className="bg-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">You are withdrawing</p>
                    <p className="text-4xl font-black text-white">{formatNaira(Number(amount))}</p>
                  </div>
                  
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-3">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Settlement Beneficiary Account</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Destination Bank:</span>
                      <strong className="text-white uppercase">{user.bankName}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Account NUBAN:</span>
                      <strong className="text-white tracking-widest font-mono">•••• •••• {user.accountNumber?.slice(-4)}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Account Name:</span>
                      <strong className="text-white uppercase">{user.accountName}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 text-center font-medium leading-relaxed">Ensure all details are valid. Instant settlement will be initiated on confirmation.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowWithdrawConfirm(false)} disabled={formLoading} className="w-full bg-transparent border border-slate-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-slate-800 transition text-xs">Cancel</button>
                    <button onClick={handleWithdraw} disabled={formLoading} className="w-full bg-amber-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-amber-400 transition flex items-center justify-center text-xs">
                      {formLoading ? '...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWithdrawRequest}>
                  {withdrawError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{withdrawError}</div>}
                  
                  {/* Real Linked Bank Quick Summary */}
                  <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-emerald-400">Active Bank Account</p>
                      <p className="text-xs font-bold text-white uppercase mt-1">{user.bankName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">NUBAN: •••• {user.accountNumber?.slice(-4)}</p>
                    </div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      SECURED
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Amount (NGN)</label>
                    <input type="number" required min="5000" max={user?.balance} value={amount} onChange={(e) => {setAmount(e.target.value); setWithdrawError('');}} className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-5 py-4 text-white text-2xl font-black tracking-tight focus:border-amber-500 focus:outline-none transition-colors" placeholder="5,000" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8 text-right">Available: <span className="font-black text-amber-500">{formatNaira(user?.balance || 0)}</span></p>
                  <button type="submit" disabled={formLoading} className="w-full bg-white text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-200 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs">Request Withdrawal</button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {showBuy && (
          <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-50 flex justify-center items-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md my-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight text-white">{showBuyConfirm ? 'CONFIRM PURCHASE' : 'PURCHASE SHARES'}</h3>
                <button onClick={() => { setShowBuy(false); setShowBuyConfirm(false); }} className="text-slate-500 hover:text-white transition-colors"><XCircle className="h-6 w-6" /></button>
              </div>

              {showBuyConfirm ? (
                <div className="space-y-6">
                  <div className="bg-slate-800 rounded-2xl p-6 text-center">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">You are purchasing</p>
                    <p className="text-4xl font-black text-white mb-1">{Number(shareCount).toLocaleString()} Shares</p>
                    <p className="text-amber-500 font-bold uppercase tracking-widest">For {formatNaira(Number(shareCount) * 5)}</p>
                  </div>
                  <p className="text-sm text-slate-400 text-center font-medium">Are you sure you want to proceed? This non-reversible transaction will be deducted from your account balance.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowBuyConfirm(false)} disabled={formLoading} className="w-full bg-transparent border border-slate-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-slate-800 transition">Cancel</button>
                    <button onClick={handleBuyShares} disabled={formLoading} className="w-full bg-amber-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-amber-400 transition flex items-center justify-center">
                      {formLoading ? '...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl mb-8">
                    <p className="text-sm text-blue-300 font-bold tracking-wide">1 Share = ₦5. Minimum entry is 2,000 shares.</p>
                    <p className="text-xs text-blue-400 mt-2 font-bold uppercase tracking-widest">Earn 4% daily on your capital for 180 days.</p>
                  </div>
                  <form onSubmit={handleBuyRequest}>
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
                      {(user?.balance || 0) < Number(shareCount)*5 ? 'Insufficient Balance' : 'Proceed to Checkout'}
                    </button>
                    {(user?.balance || 0) < Number(shareCount)*5 && (
                      <button type="button" onClick={() => { setShowBuy(false); setShowDeposit(true); }} className="w-full mt-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors">
                        Deposit Funds First
                      </button>
                    )}
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
