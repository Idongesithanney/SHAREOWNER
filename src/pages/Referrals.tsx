import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { User } from '../lib/types';
import { formatNaira, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Gift, Copy, CheckCircle2, Mail, Share2, Trophy, Crown, Award, TrendingUp } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion } from 'motion/react';

interface LeaderboardItem {
  id: string;
  name: string;
  totalEarnings: number;
  referralCode: string;
  referralsCount: number;
}

export default function Referrals() {
  const { user, token } = useAuth();
  const [referrals, setReferrals] = useState<User[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');


  useEffect(() => {
    if (!token || !user) return;
    
    async function fetchReferrals() {
      try {
        const q = query(collection(db, 'users'), where('referredBy', '==', user!.referralCode));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        // sort by newest
        data.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        setReferrals(data);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'referrals');
      } finally {
        setLoading(false);
      }
    }

    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      } catch (err) {
        console.error("Failed to fetch referral leaderboard", err);
      } finally {
        setLeaderboardLoading(false);
      }
    }

    fetchReferrals();
    fetchLeaderboard();
  }, [user?.referralCode, token]);

  const handleCopy = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !user) return <div className="min-h-screen bg-[#020617]" />;

  const filteredReferrals = referrals.filter(r => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-20">
      <header className="bg-[#020617]/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link to="/dashboard" className="p-2 mr-4 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-white font-black tracking-tight text-lg leading-tight uppercase">Referrals Network</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Grow Your Team</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Referral Info Card */}
        <div className="bg-amber-500 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Gift className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h2 className="text-black font-black uppercase tracking-tight text-2xl mb-2">Invite & Earn</h2>
            <p className="text-amber-900 font-bold uppercase tracking-widest text-xs max-w-md">
              Share your referral code and earn bonuses when your friends join and purchase shares!
            </p>
            
            <div className="mt-8">
              <p className="text-amber-900/70 text-[10px] font-black uppercase tracking-widest mb-1">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <div className="bg-black/90 backdrop-blur-sm rounded-xl py-3 px-6 text-white font-mono text-xl tracking-widest font-black inline-block border border-amber-500/20 shadow-inner">
                  {user.referralCode}
                </div>
                <button 
                  onClick={handleCopy}
                  className="p-4 bg-black/90 hover:bg-black rounded-xl text-amber-500 transition-colors shadow-lg active:scale-95"
                  title="Copy Code"
                >
                  {copied ? <CheckCircle2 className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                </button>
                <a 
                  href={`mailto:?subject=Join me on SHAREOWNER LTD&body=Sign up using my referral code: ${user?.referralCode}`}
                  className="p-4 bg-black/90 hover:bg-black rounded-xl text-amber-500 transition-colors shadow-lg active:scale-95 flex items-center justify-center"
                  title="Share via Email"
                >
                  <Mail className="h-6 w-6" />
                </a>
                <button 
                  onClick={() => {
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
                  }}
                  className="p-4 bg-black/90 hover:bg-black rounded-xl text-amber-500 transition-colors shadow-lg active:scale-95"
                  title="Share"
                >
                  <Share2 className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center shadow-lg">
            <div className="flex items-center text-blue-400 mb-2 font-bold uppercase tracking-widest text-[10px]">
              <Users className="h-4 w-4 mr-2" /> Total Referrals
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              {referrals.length} <span className="text-sm text-slate-500 tracking-normal ml-1 border border-slate-700 bg-slate-800 rounded px-2 py-1">USERS</span>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center shadow-lg">
            <div className="flex items-center text-amber-400 mb-2 font-bold uppercase tracking-widest text-[10px]">
              <Gift className="h-4 w-4 mr-2" /> Network Value
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              <span className="text-slate-500 text-2xl mr-1">₦</span>
              {/* Note: since users don't expose totalEarnings directly to referrals via rules yet, we just show dummy network value or active referrals count. */}
              {/* For now, just a placeholder of active members */}
              {referrals.filter(r => r.status === 'ACTIVE').length} <span className="text-sm text-slate-500 tracking-normal ml-1 border border-slate-700 bg-slate-800 rounded px-2 py-1">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Top Referrers Leaderboard */}
        <div className="mt-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/15 rounded-xl text-amber-500 border border-amber-500/20">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Top Referrers Leaderboard
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Top performing partners on the network by total earnings</p>
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Leaderboard rankings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
              No top referrers recorded yet. Continue growing the platform to rank #1!
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-800/80 rounded-2xl bg-slate-950/20 shadow-inner">
              <div className="grid grid-cols-12 px-4 py-3 bg-slate-950/40 border-b border-slate-800/60 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5 sm:col-span-6 pl-2">Partner Name</div>
                <div className="col-span-3 sm:col-span-2 text-center">Team Size</div>
                <div className="col-span-3 text-right pr-2">Total Earnings</div>
              </div>

              <ul className="divide-y divide-slate-800/40">
                {leaderboard.map((item, index) => {
                  const isCurrentUser = item.referralCode === user.referralCode;
                  const rank = index + 1;
                  
                  // Rank styling icons and badges
                  let rankBadge = null;
                  if (rank === 1) {
                    rankBadge = (
                      <div className="h-6 w-6 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-500" title="1st Place (Gold)">
                        <Crown className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                    );
                  } else if (rank === 2) {
                    rankBadge = (
                      <div className="h-6 w-6 bg-slate-400/20 border border-slate-400/30 rounded-full flex items-center justify-center text-slate-300" title="2nd Place (Silver)">
                        <Award className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                    );
                  } else if (rank === 3) {
                    rankBadge = (
                      <div className="h-6 w-6 bg-amber-700/20 border border-amber-700/30 rounded-full flex items-center justify-center text-amber-600" title="3rd Place (Bronze)">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                    );
                  } else {
                    rankBadge = (
                      <div className="h-6 w-6 bg-slate-800/50 border border-slate-700/30 rounded-full flex items-center justify-center text-slate-400 text-xs font-black">
                        {rank}
                      </div>
                    );
                  }

                  return (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`grid grid-cols-12 px-4 py-3.5 items-center transition hover:bg-slate-800/25 ${
                        isCurrentUser 
                          ? 'bg-amber-500/10 border-y border-amber-500/20' 
                          : ''
                      }`}
                    >
                      <div className="col-span-1 flex justify-center">
                        {rankBadge}
                      </div>

                      <div className="col-span-5 sm:col-span-6 pl-2 flex items-center space-x-2 truncate">
                        <p className={`text-xs font-bold text-white uppercase tracking-tight truncate ${isCurrentUser ? 'text-amber-400 font-extrabold' : ''}`}>
                          {item.id === user.id ? 'You (Partner)' : item.name}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[7px] sm:text-[8px] font-black tracking-widest text-[#020617] bg-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase shrink-0">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="col-span-3 sm:col-span-2 text-center">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-300 bg-slate-800/40 border border-slate-800 px-2 py-0.5 rounded">
                          {item.referralsCount} {item.referralsCount === 1 ? 'user' : 'users'}
                        </span>
                      </div>

                      <div className="col-span-3 text-right pr-2">
                        <p className={`text-xs font-mono font-black ${isCurrentUser ? 'text-amber-400' : 'text-slate-200'}`}>
                          {formatNaira(item.totalEarnings)}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Downline List */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Your Network</h3>
            <div className="flex bg-slate-900 border border-slate-700 p-1 rounded-xl">
              <button 
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${statusFilter === 'ALL' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
              >
                All
              </button>
              <button 
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${statusFilter === 'ACTIVE' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setStatusFilter('PENDING')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${statusFilter === 'PENDING' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
              >
                Pending
              </button>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            {filteredReferrals.length === 0 ? (
              <div className="p-12 text-center text-[10px] uppercase font-bold tracking-widest text-slate-500 flex flex-col items-center">
                <UserPlus className="h-12 w-12 text-slate-700 mb-4" />
                {statusFilter === 'ALL' ? 'No referrals yet. Share your code to get started.' : `No ${statusFilter.toLowerCase()} referrals.`}
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {filteredReferrals.map((r) => (
                  <li key={r.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-800/50 transition">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center text-white border border-slate-700 shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight text-white">{r.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Joined {formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded inline-block ${
                        r.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
