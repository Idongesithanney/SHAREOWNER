import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import LandingPage from './pages/Landing';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/Admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  balance: number;
  totalEarnings: number;
  referralCode: string;
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
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (tokenArg: string, userArg: User) => {
    localStorage.setItem('token', tokenArg);
    setToken(tokenArg);
    setUser(userArg);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-amber-500 font-bold uppercase tracking-widest text-xs">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={!token ? <AuthPage /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={token && user?.role === 'USER' ? <Dashboard /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={token && user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
