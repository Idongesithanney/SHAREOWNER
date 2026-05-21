import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Smartphone, KeyRound, Lock, AlertCircle, ArrowRight, LogOut, Check } from 'lucide-react';
import { useAuth } from '../App';
import { formatNaira } from '../lib/utils';

interface TwoFactorVerifyProps {
  onVerified: () => void;
}

export function TwoFactorVerify({ onVerified }: TwoFactorVerifyProps) {
  const { user, logout } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsTimer, setSmsTimer] = useState(0);
  const [sentCode, setSentCode] = useState<string>('');
  const [showHelperCode, setShowHelperCode] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (smsTimer > 0) {
      interval = setInterval(() => {
        setSmsTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [smsTimer]);

  if (!user) return null;

  const isSms = user.twoFactorType === 'SMS';

  // Helper to generate and flash code for testing/demo
  const triggerSmsSend = () => {
    if (smsTimer > 0) return;
    
    // Generate a secure 6-digit OTP
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(generated);
    setSmsTimer(60);
    setError('');
    setShowHelperCode(true);

    // Create a beautiful custom toast notification at the top of the browser!
    const toastId = 'sms-toast-' + Date.now();
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
            <p class="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Incoming SMS Security Alert</p>
            <p class="text-xs text-slate-300 font-medium"><strong>[SHAREOWNER LTD]</strong> Your account verification code is <span class="text-amber-400 font-mono font-black text-sm">${generated}</span>. Expires in 5 minutes.</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      
      // Animation in
      setTimeout(() => {
        toast.style.transform = 'translate(-50%, 0)';
        toast.style.opacity = '1';
      }, 100);

      // Auto dismiss
      setTimeout(() => {
        toast.style.transform = 'translate(-50%, -100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 9000);
    }
  };

  // If SMS and no code has been generated yet, auto-trigger the first simulated text
  useEffect(() => {
    if (isSms && !sentCode) {
      triggerSmsSend();
    }
  }, [isSms, sentCode]);

  // For TOTP, we can calculate code deterministically from secret so the user knows what to enter,
  // or show a test tip
  const getExpectedTotp = () => {
    // Generate a stable code based on secret or a fixed demo code
    const secret = user.twoFactorSecret || 'SOWN-7K9F-4P2H-9W3L';
    let codeValue = 123456;
    try {
      // Create a deterministic code from some basic algorithm so they can preview it
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

  const expectedCode = isSms ? sentCode : getExpectedTotp();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      if (code.trim() === expectedCode) {
        onVerified();
      } else {
        setError('Verification failed. Invalid code.');
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#020617] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md relative"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-amber-500/10 rounded-2xl mb-4 text-amber-500">
            <Lock className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">2FA Verification</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto">
            This account is protected by two-factor authentication. Please enter your secondary verification code.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-start mb-6 text-sm">
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                {isSms ? 'SMS Passcode' : 'Authenticator Code'}
              </label>
              {isSms && (
                <button
                  type="button"
                  onClick={triggerSmsSend}
                  disabled={smsTimer > 0}
                  className="text-xs font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors uppercase tracking-widest"
                >
                  {smsTimer > 0 ? `Resend In ${smsTimer}s` : 'Resend SMS'}
                </button>
              )}
            </div>

            <input
              type="text"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, '');
                setCode(numeric);
              }}
              className="w-full bg-[#020617] border border-slate-700 rounded-2xl px-5 py-4 text-center text-white text-3xl font-mono tracking-[0.5em] focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••"
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-amber-500 text-black font-black py-4 rounded-xl hover:bg-amber-400 transition-all uppercase tracking-widest text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying Identity...' : 'Confirm and Continue'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-4">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-center flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Secured via {isSms ? 'SMS to user phone' : 'TOTP Authenticator app'}
          </p>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors py-2 px-3 hover:bg-slate-800 rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            Cancel & Exit Portal
          </button>
        </div>

        {/* Beautiful Interactive Dev/Demo Assistance Block */}
        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded text-[8px] font-black">DEMO TIP</span>
            How to verify
          </p>
          <p className="text-xs text-slate-400 leading-normal">
            {isSms ? (
              <>
                An SMS notification has been emitted as a system announcement at the top of your page. Just enter the <span className="text-amber-400 font-bold">{expectedCode}</span> passcode to proceed.
              </>
            ) : (
              <>
                Copy and paste the seed key into Google Authenticator or enter your test sandbox OTP code directly: <span className="text-amber-400 font-mono font-bold">{expectedCode}</span>.
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
