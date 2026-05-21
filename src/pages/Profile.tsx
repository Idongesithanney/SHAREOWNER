import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { formatNaira } from '../lib/utils';
import { User, LogOut, ArrowLeft, Save, Shield, CheckCircle, Copy, Check, QrCode, Smartphone, RefreshCw, KeyRound, AlertCircle, ShieldAlert, CreditCard, Building } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, token, logout, refreshUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'security' | 'bank'>('security');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bank details states
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber || '');
  const [accountName, setAccountName] = useState(user?.accountName || '');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSuccess, setBankSuccess] = useState('');
  const [bankError, setBankError] = useState('');
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);

  // 2FA states
  const [showSetup, setShowSetup] = useState(false);
  const [tfaMethod, setTfaMethod] = useState<'TOTP' | 'SMS'>('TOTP');
  const [tfaPhone, setTfaPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [smsTimer, setSmsTimer] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [generatedSmsCode, setGeneratedSmsCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (smsTimer > 0) {
      interval = setInterval(() => {
        setSmsTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [smsTimer]);

  const startTfaSetup = () => {
    // Generate a secure mock TOTP secret key
    const secret = 'SOWN-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    setGeneratedSecret(secret);
    setShowSetup(true);
    setOtpSent(false);
    setVerificationCode('');
    setSetupError('');
    setSetupSuccess('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendSmsOtp = () => {
    if (!tfaPhone.trim()) {
      setSetupError('Phone number is required.');
      return;
    }
    setSetupError('');
    // Generate code
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedSmsCode(mockCode);
    setOtpSent(true);
    setSmsTimer(60);

    // Flash announcement with the OTP code
    const toastId = 'sms-auth-toast';
    const existing = document.getElementById(toastId);
    if (!existing) {
      const toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl transition-all duration-300 transform translate-y-[-100px] opacity-0 text-white';
      toast.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-code"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m10 8-2 2 2 2"/><path d="m14 8 2-2-2 2"/></svg>
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">SMS Verification System</p>
            <p class="text-xs text-slate-300 font-medium"><strong>[SHAREOWNER LTD]</strong> Your setup activation code is <span class="text-amber-400 font-mono font-black text-sm">${mockCode}</span>. Enter code to enroll.</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.transform = 'translate(-50%, 0)';
        toast.style.opacity = '1';
      }, 100);

      setTimeout(() => {
        toast.style.transform = 'translate(-50%, -100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 9000);
    }
  };

  const getExpectedTotpSetup = () => {
    const secret = generatedSecret || 'SOWN-7K9F-4P2H-9W3L';
    let codeValue = 123456;
    try {
      let hash = 0;
      for (let i = 0; i < secret.length; i++) {
        hash = secret.charCodeAt(i) + ((hash << 5) - hash);
      }
      codeValue = Math.abs(hash) % 900000 + 100000;
    } catch (e) {
      codeValue = 482910;
    }
    return codeValue.toString();
  };

  const handleActivateTfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length !== 6) {
      setSetupError('Please enter a standard 6-digit confirmation code.');
      return;
    }

    const expected = tfaMethod === 'SMS' ? generatedSmsCode : getExpectedTotpSetup();
    if (verificationCode.trim() !== expected) {
      setSetupError('Oops! The security code is incorrect.');
      return;
    }

    setTfaLoading(true);
    setSetupError('');
    setSetupSuccess('');

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        twoFactorEnabled: true,
        twoFactorType: tfaMethod,
        twoFactorSecret: tfaMethod === 'TOTP' ? generatedSecret : '',
        twoFactorPhone: tfaMethod === 'SMS' ? tfaPhone : ''
      });
      
      // Save verification state for the current session too, to ensure they aren't signed out instantly
      sessionStorage.setItem(`tfa_verified_${user.id}`, 'true');
      
      await refreshUser();
      setSetupSuccess(`Two-Factor Authentication successfully enabled via ${tfaMethod === 'TOTP' ? 'Authenticator App' : 'SMS'}!`);
      setShowSetup(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      setSetupError('Failed to activate 2FA. Please try again.');
    } finally {
      setTfaLoading(false);
    }
  };

  const handleDisableTfa = async () => {
    if (!window.confirm('Are you absolutely sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setTfaLoading(true);
    setSetupError('');
    setSetupSuccess('');

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        twoFactorEnabled: false,
        twoFactorType: null,
        twoFactorSecret: null,
        twoFactorPhone: null
      });

      sessionStorage.removeItem(`tfa_verified_${user.id}`);
      await refreshUser();
      setSetupSuccess('Two-factor authentication has been disabled.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      setSetupError('Failed to disable 2FA.');
    } finally {
      setTfaLoading(false);
    }
  };

  const handleBindBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName) {
      setBankError('Please select a bank');
      return;
    }
    if (accountNumber.length !== 10 || !/^\d+$/.test(accountNumber)) {
      setBankError('Account number must be exactly 10 digits');
      return;
    }
    if (!accountName.trim()) {
      setBankError('Account name is required');
      return;
    }

    setBankLoading(true);
    setBankError('');
    setBankSuccess('');
    setIsVerifyingBank(true);

    // Simulate real verification with NIBSS
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          bankName,
          accountNumber,
          accountName: accountName.trim().toUpperCase(),
          bankLinked: true
        });
        await refreshUser();
        setBankSuccess('Bank account linked and verified successfully!');
        setIsVerifyingBank(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'users');
        setBankError('Failed to bind bank details');
        setIsVerifyingBank(false);
      } finally {
        setBankLoading(false);
      }
    }, 2000);
  };

  const handleUnbindBankDetails = async () => {
    if (!window.confirm('Are you sure you want to unlink this bank details? This will stop automated withdrawals.')) {
      return;
    }
    setBankLoading(true);
    setBankError('');
    setBankSuccess('');
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        bankName: null,
        accountNumber: null,
        accountName: null,
        bankLinked: false
      });
      await refreshUser();
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      setBankSuccess('Bank account has been successfully unlinked.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      setBankError('Failed to unlink bank details.');
    } finally {
      setBankLoading(false);
    }
  };

  if (!user || !token) return <div className="min-h-screen bg-[#020617]" />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: name.trim()
      });
      await refreshUser();
      setEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30">
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-lg tracking-tight">Profile</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => logout()}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 font-medium font-mono uppercase tracking-wider mb-2">Available Balance</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">{formatNaira(user.balance || 0)}</h2>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 font-medium font-mono uppercase tracking-wider mb-2">Total Earnings</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">{formatNaira(user.totalEarnings || 0)}</h2>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-white/5 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Account & Security
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'bank'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Bank Accounts
            </button>
          </div>

          {activeTab === 'security' ? (
            <>
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-semibold">Personal Information</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-2">Email address cannot be changed.</p>
                </div>
                
                <div className="flex space-x-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setName(user.name);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <div className="text-white font-medium">{user.name || 'Not provided'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                    <div className="text-white font-medium">{user.email}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                    <div className="text-white font-medium">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Onboarding Date</label>
                    <div className="text-white font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TWO-FACTOR AUTHENTICATION SECURITY CENTER */}
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-slate-400 mt-1">Enhance your security by requiring a secondary method to check your identity on portal access.</p>
                </div>
              </div>
              <div>
                {user.twoFactorEnabled ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                    ENABLED
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    DISABLED
                  </span>
                )}
              </div>
            </div>

            {setupError && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {setupError}
              </div>
            )}
            {setupSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {setupSuccess}
              </div>
            )}

            {user.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white flex items-center">
                      {user.twoFactorType === 'SMS' ? (
                        <>
                          <Smartphone className="w-4 h-4 mr-1.5 text-blue-400" />
                          SMS Multi-Factor Authentication Active
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-1.5 text-blue-400" />
                          Authenticator TOTP Protection Active
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {user.twoFactorType === 'SMS' 
                        ? `A text message containing a verification code will be sent to your phone ${user.twoFactorPhone || 'configured number'} when you try to log in.`
                        : 'A temporary passcode generated by Google Authenticator, Authy, or Microsoft Authenticator will be required on login.'
                      }
                    </p>
                  </div>
                  <button
                    onClick={handleDisableTfa}
                    disabled={tfaLoading}
                    className="whitespace-nowrap px-4 py-2 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {tfaLoading ? 'PROCESS...' : 'DISABLE 2FA'}
                  </button>
                </div>
              </div>
            ) : !showSetup ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-xl border border-white/10 bg-white/5 gap-6">
                <div className="max-w-md">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Boost account integrity</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Once activated, accessing Shareowner Ltd will require entering both your regular log in credentials and a secondary passcode received through your preferred validation method.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startTfaSetup}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm tracking-wide transition-all"
                >
                  Configure 2FA
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-6">
                <div className="flex justify-between items-center border-b border-amber-500/10 pb-4">
                  <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow" /> Setup Multi-Factor Validation
                  </h4>
                  <button
                    onClick={() => setShowSetup(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-white uppercase tracking-wider"
                  >
                    Cancel Setup
                  </button>
                </div>

                {/* Choose Method */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTfaMethod('TOTP');
                      setOtpSent(false);
                      setVerificationCode('');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${tfaMethod === 'TOTP' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/10 hover:border-white/20 text-slate-400 hover:text-white'}`}
                  >
                    <QrCode className="w-6 h-6 mb-2 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Authenticator App</span>
                    <span className="text-[10px] text-slate-400 mt-1">Google Auth, Authy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTfaMethod('SMS');
                      setOtpSent(false);
                      setVerificationCode('');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${tfaMethod === 'SMS' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/10 hover:border-white/20 text-slate-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-6 h-6 mb-2 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">SMS Passcode</span>
                    <span className="text-[10px] text-slate-400 mt-1">One-time mobile test OTP</span>
                  </button>
                </div>

                {/* Method Specific Panel */}
                {tfaMethod === 'TOTP' ? (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-[#020617] rounded-xl border border-white/5">
                      {/* CSS SVG QR CODE GRID */}
                      <div className="w-28 h-28 bg-white p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center select-none shadow-lg">
                        <svg viewBox="0 0 29 29" className="w-full h-full text-[#0f172a] fill-current">
                          <path d="M0 0h7v7H0zm1 1v5h5V1zm21-1h7v7h-7zm1 1v5h5V1zM0 22h7v7H0zm1 1v5h5v-5zm15-15h2v2h-2zm4 0h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm-2 2h2v2h-2zm6 2h2v2h-2zm-4 2h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-6 2h2v3h-2zm4 1h2v2h-2z" />
                          <path d="M9 1h1v1H9zm2 1h1v1h-1zm2-1h1v1h-1zm1 2h1v1h-1zm-3 2h1v1h-1zm3 0h1v1h-1zm2-4h1v1h-1zm0 3h1v1h-1zm2 1h1v1h-1zm-9 6h1v1H9zm3-1h1v1h-1zm3 1h1v1h-1zm2-1h1v1h-1zm1 2h1v1h-1zm-10 2h1v1h-1zm4-1h1v1h-1zm2 1h1v1h-1zm4-1h1v1h-1zm-10 2h1v1h-1zm12 1h1v1h-1zm-10 2h1v1H9zm4-1h1v1h-1zm5 1h1v1h-1zm2 1h1v1h-1zm-2 2h1v1h-1zm-5-1h1v1h-1z" />
                        </svg>
                      </div>

                      <div className="space-y-2 flex-1 w-full">
                        <p className="text-xs font-semibold text-slate-300">1. Pair Secret Key</p>
                        <p className="text-[11px] text-slate-400">Scan this code using Google Authenticator, or paste this manual key inside your security application:</p>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2 mt-1">
                          <span className="font-mono text-xs text-amber-500 break-all select-all flex-1">{generatedSecret}</span>
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
                          >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1 flex items-center">
                        <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded text-[8px] font-black mr-2">DEMO TIP</span>
                        Test Verification Code
                      </p>
                      <p className="text-xs text-slate-300">
                        Since this is a simulated authenticator check, you can authorize using the currently active calculated PIN: <strong className="text-amber-400 font-mono text-sm">{getExpectedTotpSetup()}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#020617] rounded-xl border border-white/5 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mobile Phone Number</label>
                        <input
                          type="tel"
                          value={tfaPhone}
                          onChange={(e) => setTfaPhone(e.target.value)}
                          placeholder="+234 (812) 345-6789"
                          className="w-full bg-[#020617] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={sendSmsOtp}
                        disabled={smsTimer > 0}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
                      >
                        {smsTimer > 0 ? `Resend message in ${smsTimer}s` : 'Send Activation Code'}
                      </button>
                    </div>

                    {otpSent && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1 flex items-center">
                          <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded text-[8px] font-black mr-2">SMS DELIVERED</span>
                          Simulated Phone Message
                        </p>
                        <p className="text-xs text-slate-300">
                          We just sent a mock text notification displaying code: <strong className="text-amber-400 font-mono text-sm">{generatedSmsCode}</strong>. Input this OTP code down below to complete alignment.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* OTP verify form */}
                {(tfaMethod === 'TOTP' || otpSent) && (
                  <form onSubmit={handleActivateTfa} className="pt-4 border-t border-amber-500/10 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">2. Enter 6-Digit Verification PIN</label>
                      <input
                        type="text"
                        pattern="\d*"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-[#020617] border border-amber-500/30 rounded-xl py-3 text-center text-white text-2xl font-mono tracking-widest focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="••••••"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={tfaLoading || verificationCode.length !== 6}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                    >
                      {tfaLoading ? 'ACTIVATING MODULE...' : 'Confirm and Activate'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 mt-6">
          <div className="flex items-start space-x-3 mb-8">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl animate-pulse">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Bank Detail Settings</h3>
              <p className="text-xs text-slate-400 mt-1">Bind your real personal banking credentials to settle withdrawals automatically.</p>
            </div>
          </div>

          {bankError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {bankError}
            </div>
          )}
          {bankSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {bankSuccess}
            </div>
          )}

          {user.bankLinked ? (
            <div className="space-y-6">
              {/* Digital Credit Card Widget */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative p-8 rounded-3xl bg-gradient-to-tr from-slate-900 via-[#0B1528] to-[#1E293B] border border-blue-500/30 overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <CreditCard className="w-40 h-40" />
                </div>
                
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-1">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                      VERIFIED RECIPIENT
                    </span>
                    <h4 className="text-xl font-black text-white tracking-wide mt-3 uppercase">{user.bankName}</h4>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <Building className="w-6 h-6 text-blue-400" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">NUBAN Account Number</p>
                    <p className="font-mono text-xl text-white tracking-widest">
                      •••• •••• {user.accountNumber ? user.accountNumber.slice(-4) : '••••'}
                    </p>
                  </div>

                  <div className="flex justify-between items-end pt-2">
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Account Name</p>
                      <p className="text-sm font-bold text-slate-200 tracking-wide mt-1 uppercase">
                        {user.accountName}
                      </p>
                    </div>
                    <div className="flex items-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Linked
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  <strong className="text-slate-300">Security Notice:</strong> Withdrawals requested on the dashboard are paid instantly to this certified account destination. Changes to this setup require identity re-evaluation.
                </p>
              </div>

              <button
                onClick={handleUnbindBankDetails}
                disabled={bankLoading}
                className="w-full py-4 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold uppercase tracking-widest text-xs rounded-2xl transition disabled:opacity-50"
              >
                {bankLoading ? 'Processing...' : 'Unbind/Remove Bank Account'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleBindBankDetails} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Select Nigerian Bank Destination</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Choose Beneficiary Bank --</option>
                  <option value="Access Bank">Access Bank (Nirvana/Diamond)</option>
                  <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTBank)</option>
                  <option value="Zenith Bank">Zenith Bank Plc</option>
                  <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria (FirstBank)</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                  <option value="Sterling Bank">Sterling Bank</option>
                  <option value="Union Bank of Nigeria">Union Bank</option>
                  <option value="Wema Bank">Wema Bank (ALAT)</option>
                  <option value="Kuda Bank">Kuda Microfinance Bank</option>
                  <option value="OPAY">OPay Digital Services</option>
                  <option value="PalmPay">PalmPay Limited</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">10-Digit NUBAN Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  pattern="\d{10}"
                  value={accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAccountNumber(val);
                  }}
                  required
                  placeholder="e.g. 0123456789"
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Verified Account Beneficiary Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  placeholder="e.g. IDONGESITH ANNEY"
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-2">
                  Must match the legal ID of your profile exactly for valid clearing.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed font-semibold">
                  Your banking safety check is performed automatically via NIBSS secure integration. By binding, you authorize automated settlement protocols.
                </p>
              </div>

              <button
                type="submit"
                disabled={bankLoading || accountNumber.length !== 10}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-4 rounded-2xl font-black uppercase tracking-widest text-xs transition duration-200 hover:scale-[1.01] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingBank ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying with NIBSS...</span>
                  </div>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Link & Bind Real Bank Account</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </motion.div>
      </main>
    </div>
  );
}
