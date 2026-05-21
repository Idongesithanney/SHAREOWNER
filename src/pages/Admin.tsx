import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { formatNaira } from '../lib/utils';
import { SystemStats, User, Transaction, ShareInvestment } from '../lib/types';
import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle, Users, Activity, Wallet, FileText, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, writeBatch, getDoc, serverTimestamp, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function AdminDashboard() {
  const { token, logout, user } = useAuth();
  const [data, setData] = useState<{users: User[], transactions: Transaction[], shares: ShareInvestment[], stats: SystemStats} | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchAdminData = async () => {
    if (!token || !user || user.role !== 'ADMIN') return;
    try {
      const [usersSnap, txnsSnap, sharesSnap, statsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'))),
        getDocs(query(collection(db, 'transactions'))),
        getDocs(query(collection(db, 'shares'))),
        getDoc(doc(db, 'stats', 'global'))
      ]);

      setData({
        users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
        transactions: txnsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)),
        shares: sharesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShareInvestment)),
        stats: statsSnap.exists() ? (statsSnap.data() as SystemStats) : { companyReserve: 0, totalTaxCollected: 0 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user?.id, token]);

  const handleSimulateDay = async () => {
    if (!confirm('Run daily return cron simulation? This distributes ROI and deducts tax.')) return;
    setSimulating(true);
    try {
      const batch = writeBatch(db);
      const activeShares = data?.shares.filter(s => s.status === 'ACTIVE') || [];
      let totalDistributed = 0;
      let totalTax = 0;

      for (const share of activeShares) {
        if (share.daysRemaining > 0) {
          const grossReturn = share.dailyIncome;
          const tax = grossReturn * 0.04;
          const netReturn = grossReturn - tax;

          const userRef = doc(db, 'users', share.userId);
          batch.update(userRef, {
            balance: increment(netReturn),
            totalEarnings: increment(netReturn)
          });

          const nextDaysRemaining = share.daysRemaining - 1;
          const shareRef = doc(db, 'shares', share.id);
          batch.update(shareRef, {
            daysRemaining: nextDaysRemaining,
            status: nextDaysRemaining === 0 ? 'MATURED' : 'ACTIVE'
          });

          totalDistributed += netReturn;
          totalTax += tax;

          const newTxnRef = doc(collection(db, 'transactions'));
          batch.set(newTxnRef, {
            userId: share.userId,
            type: 'DAILY_RETURN',
            amount: netReturn,
            status: 'COMPLETED',
            createdAt: serverTimestamp(),
            memo: `Daily Return from ${share.sharesAmount} shares`
          });
        }
      }

      const statsRef = doc(db, 'stats', 'global');
      batch.set(statsRef, {
        totalTaxCollected: increment(totalTax),
        companyReserve: increment(-totalDistributed)
      }, { merge: true });

      await batch.commit();

      alert(`Simulated day: distributed ₦${totalDistributed}, collected ₦${totalTax} in tax.`);
      fetchAdminData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cron_batch');
      alert('Error running simulation');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Platform Administration</h1>
            <p className="text-slate-400">System overview and chron job management</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={handleSimulateDay} 
              disabled={simulating}
              className="px-6 py-2 bg-amber-500 text-black font-black rounded-xl flex items-center transition hover:bg-amber-400 disabled:opacity-50"
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              {simulating ? 'Processing...' : 'Simulate 1 Day (Cron)'}
            </button>
            <button 
              onClick={logout} 
              className="px-4 py-2 border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition flex items-center space-x-2 text-sm bg-red-500/5 shadow-lg active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center text-blue-400 mb-4 font-bold uppercase tracking-widest text-xs"><Users className="h-5 w-5 mr-2" /> Total Users</div>
            <div className="text-4xl font-black tracking-tight text-white">{data?.users.length}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center text-amber-500 mb-4 font-bold uppercase tracking-widest text-xs"><Activity className="h-5 w-5 mr-2" /> Active Shares</div>
            <div className="text-4xl font-black tracking-tight text-white">{data?.shares.filter(s => s.status === 'ACTIVE').length}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center text-emerald-400 mb-4 font-bold uppercase tracking-widest text-xs"><Wallet className="h-5 w-5 mr-2" /> Company Reserve</div>
            <div className="text-4xl font-black tracking-tight text-white">{formatNaira(data?.stats?.companyReserve || 0)}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center text-red-400 mb-4 font-bold uppercase tracking-widest text-xs"><FileText className="h-5 w-5 mr-2" /> Total Tax Collected</div>
            <div className="text-4xl font-black tracking-tight text-white">{formatNaira(data?.stats?.totalTaxCollected || 0)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400 mb-6">Recent Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="pb-3">Name & Email</th>
                    <th className="pb-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data?.users.slice(0, 8).map(u => (
                    <tr key={u.id}>
                      <td className="py-3">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 text-right font-medium text-emerald-400">{formatNaira(u.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400 mb-6">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data?.transactions.slice().sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8).map(t => (
                    <tr key={t.id}>
                      <td className="py-3">
                        <div className="font-medium text-white">{t.type}</div>
                        <div className="text-[10px] text-slate-500">{t.memo}</div>
                      </td>
                      <td className="py-3 font-medium text-white">{formatNaira(t.amount)}</td>
                      <td className="py-3 text-right">
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                          t.status === 'COMPLETED' ? 'bg-emerald-400/10 text-emerald-400' : 
                          t.status === 'PENDING' ? 'bg-amber-400/10 text-amber-400' : 'bg-red-400/10 text-red-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
