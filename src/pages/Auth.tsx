import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { email, password, name, referralCode };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <Link to="/" className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center transition-colors">
        <ArrowLeft className="h-5 w-5 mr-2" /> Back
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <TrendingUp className="h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-3xl font-black tracking-tight text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 mt-2 text-center text-sm">
            {isLogin ? 'Enter your credentials to access your portal' : 'Join Shareowner Ltd and multiply your wealth today.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-xl flex items-center mb-6 text-sm">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Referral Code (Optional)</label>
              <input 
                type="text" 
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="REF_XXXXXX"
              />
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 text-black font-black py-4 rounded-xl hover:bg-amber-400 transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-slate-400 font-medium hover:text-white transition-colors text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
