import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShieldCheck, Zap, Users, ArrowRight } from 'lucide-react';
import { FAQ } from '../components/FAQ';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img src="/logo.png" alt="Shareowner Logo" className="h-10 sm:h-12 object-contain" />
            </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="hidden sm:flex px-4 py-2 rounded-full border border-slate-600 text-sm font-medium hover:bg-slate-800 transition text-white">Join Telegram</a>
            <Link to="/auth" className="px-6 py-2.5 rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              Access Portal
            </Link>
          </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-sm font-bold uppercase tracking-widest">Next-Gen Wealth Engine</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
            Multiply Your Wealth.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">
              Own the Future.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Connect with promising companies. Earn 4% daily returns and up to 12% on referrals through our robust share promotion ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth" className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-500 text-black font-black text-lg hover:bg-amber-400 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center">
              Start Investing Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-full border border-slate-700 text-white font-bold hover:bg-slate-900 transition-colors">
              How it works
            </a>
          </div>
        </motion.div>
      </section>

      {/* Stats/Trust Badges */}
      <section className="bg-slate-900/50 py-12 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Daily ROI', value: '4%' },
            { label: 'Referral Bonus', value: '12%' },
            { label: 'Maturity', value: '180 Days' },
            { label: 'Share Target', value: '10x' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-4xl font-black text-amber-500 mb-2">{stat.value}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* About Us */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">About <span className="text-amber-500">SHAREOWNER</span></h2>
            <p className="text-lg text-slate-400 mb-6 leading-relaxed">
              We are a dynamic share promotion company dedicated to connecting investors with promising companies. Our mission is to promote and increase public awareness of companies' shares while creating rewarding opportunities for our agents and partners.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Through strategic promotion, trusted partnerships, and a commitment to growth, we help companies expand their investor reach while creating sustainable earning opportunities for our network.
            </p>
            <ul className="space-y-4">
              {[
                { icon: Zap, text: 'Instant Automated Withdrawals' },
                { icon: Users, text: 'Lucrative Multi-level Referral Engine' },
                { icon: ShieldCheck, text: 'Bank-Grade Security & Encryption' }
              ].map((item, i) => (
                <li key={i} className="flex items-center text-slate-300 font-medium">
                  <div className="p-2 rounded-lg bg-amber-500/10 mr-4">
                    <item.icon className="h-6 w-6 text-amber-500" />
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent blur-3xl rounded-full"></div>
            <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-black tracking-tight text-white mb-6">Investment Blueprint</h3>
              <div className="space-y-6">
                <div className="flex justify-between border-b border-slate-700 pb-4">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Share Rate (Min 2k)</span>
                  <span className="text-white font-bold">₦5 / Share</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 pb-4">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Reg. Simulation</span>
                  <span className="text-amber-500 font-bold">₦50,000</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 pb-4">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Daily Return</span>
                  <span className="text-green-500 font-bold">₦2,000 (4%)</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest leading-relaxed mt-1">10-Day Projected Net</span>
                  <span className="text-white font-black text-2xl">₦19,200</span>
                </div>
                <p className="text-xs text-slate-500 font-medium italic">*4% platform tax applied to payouts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Footer */}
      <footer className="h-16 bg-slate-950 border-t border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-2 md:mb-0">
            <img src="/logo.png" alt="Shareowner Logo" className="h-6 object-contain" />
          </div>
          <p>© {new Date().getFullYear()} Shareowner Ltd. <span className="hidden md:inline">Reg ID: SO/LTD/2026.</span></p>
        </div>
      </footer>
    </div>
  );
}
