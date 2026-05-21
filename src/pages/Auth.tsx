import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, loginUser, registerUser, loginWithGoogle } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await loginUser(email, password);
      } else {
        user = await registerUser(email, password);
      }
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const isNewUser = !userSnap.exists();
      const userData = isNewUser ? {
        name: name || user.displayName || 'Investor',
        email: user.email || '',
        role: (user.email === 'idongesithanney@gmail.com' || user.email === 'admin@shareowner.com') ? 'ADMIN' : 'USER',
        balance: 0,
        totalEarnings: 0,
        referralCode: `REF_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        referredBy: referralCode || '',
        createdAt: serverTimestamp(),
        status: 'ACTIVE'
      } : userSnap.data();

      if (isNewUser) {
        try {
          await setDoc(userRef, userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'users');
        }
      }

      login(user.uid, { id: user.uid, ...userData } as any);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already in use. Please log in.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection, disable ad-blockers, or open the app in a new tab if you are in a preview iframe.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const isNewUser = !userSnap.exists();
      const userData = isNewUser ? {
        name: user.displayName || 'Investor',
        email: user.email || '',
        role: (user.email === 'idongesithanney@gmail.com' || user.email === 'admin@shareowner.com') ? 'ADMIN' : 'USER',
        balance: 0,
        totalEarnings: 0,
        referralCode: `REF_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        referredBy: referralCode || '',
        createdAt: serverTimestamp(),
        status: 'ACTIVE'
      } : userSnap.data();

      if (isNewUser) {
        try {
          await setDoc(userRef, userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'users');
        }
      }

      login(user.uid, { id: user.uid, ...userData } as any);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please try opening the app in a new tab if you are in a preview window.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // user closed popup
      } else {
        setError(err.message || 'Google Authentication failed');
      }
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
          <img src="/logo.png" alt="Shareowner Logo" className="h-20 w-20 rounded-xl bg-white p-2 object-contain mb-4" />
          <h2 className="text-3xl font-black tracking-tight text-white text-center">
            Access Your Portal
          </h2>
          <p className="text-slate-400 mt-2 text-center text-sm">
            Join Shareowner Ltd and multiply your wealth today.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-xl flex items-center mb-6 text-sm">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
              <input 
                type="text" 
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
                placeholder="Enter if you have one"
              />
            </div>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-black font-black py-4 rounded-xl hover:bg-amber-400 transition-colors mt-6 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'LOG IN' : 'SIGN UP')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-slate-700 w-full" />
          <span className="text-slate-500 text-xs font-bold uppercase">or</span>
          <div className="h-px bg-slate-700 w-full" />
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-6 bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }} 
              className="text-amber-500 hover:text-amber-400 font-bold ml-1 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
