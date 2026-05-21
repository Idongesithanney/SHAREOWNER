import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import LandingPage from './pages/Landing';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/Admin';
import { auth, db, logoutUser } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

import TransactionsPage from './pages/Transactions';
import ReferralsPage from './pages/Referrals';
import ProfilePage from './pages/Profile';
import { Chatbot } from './components/Chatbot';
import { TwoFactorVerify } from './components/TwoFactorVerify';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  balance: number;
  totalEarnings: number;
  referralCode: string;
  twoFactorEnabled?: boolean;
  twoFactorType?: 'TOTP' | 'SMS';
  twoFactorSecret?: string;
  twoFactorPhone?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankLinked?: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTfaVerified, setIsTfaVerified] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      if (user.twoFactorEnabled) {
        setIsTfaVerified(sessionStorage.getItem(`tfa_verified_${user.id}`) === 'true');
      } else {
        setIsTfaVerified(true);
      }
    } else {
      setIsTfaVerified(false);
    }
  }, [user]);

  const refreshUser = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setUser({ id: snap.id, ...snap.data() } as User);
      } else {
        setUser(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setToken(firebaseUser.uid);
        await refreshUser(firebaseUser.uid);
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (tokenArg: string, userArg: User) => {
    setToken(tokenArg);
    setUser(userArg);
    if (userArg.twoFactorEnabled) {
      setIsTfaVerified(sessionStorage.getItem(`tfa_verified_${userArg.id}`) === 'true');
    } else {
      setIsTfaVerified(true);
    }
  };

  const logout = () => {
    if (user) {
      sessionStorage.removeItem(`tfa_verified_${user.id}`);
    }
    logoutUser();
    setToken(null);
    setUser(null);
    setIsTfaVerified(false);
  };

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (token) {
        inactivityTimer = setTimeout(() => {
          logout();
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    if (token) {
      resetTimer();
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => document.addEventListener(event, resetTimer));

      return () => {
        clearTimeout(inactivityTimer);
        events.forEach(event => document.removeEventListener(event, resetTimer));
      };
    }
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-amber-500 font-bold uppercase tracking-widest text-xs">Loading...</div>;
  }

  if (token && user && !isTfaVerified) {
    return (
      <AuthContext.Provider value={{ token, user, login, logout, refreshUser: () => refreshUser(token!) }}>
        <TwoFactorVerify onVerified={() => {
          sessionStorage.setItem(`tfa_verified_${user.id}`, 'true');
          setIsTfaVerified(true);
        }} />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser: () => refreshUser(token!) }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={(!token || !user) ? <AuthPage /> : (user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)} />
          <Route path="/dashboard" element={token && user?.role === 'USER' ? <Dashboard /> : (user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/auth" />)} />
          <Route path="/admin" element={token && user?.role === 'ADMIN' ? <AdminDashboard /> : (token ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />)} />
          <Route path="/transactions" element={token && user?.role === 'USER' ? <TransactionsPage /> : (user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/auth" />)} />
          <Route path="/referrals" element={token && user?.role === 'USER' ? <ReferralsPage /> : (user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/auth" />)} />
          <Route path="/profile" element={token && user?.role === 'USER' ? <ProfilePage /> : (user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/auth" />)} />
        </Routes>
        {token && user?.role === 'USER' && <Chatbot />}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
