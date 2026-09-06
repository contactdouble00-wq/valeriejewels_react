import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Lock, Mail, ArrowRight, AlertCircle,
  KeyRound, RefreshCw, CheckCircle,
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminLogin({ onLoginSuccess }) {
  // Step 1: Credentials
  const [email, setEmail] = useState('admin@valeriejewels.com');
  const [password, setPassword] = useState('Admin@Valerie2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: OTP
  const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP
  const [pendingUserId, setPendingUserId] = useState(null);
  const [devOtp, setDevOtp] = useState(null); // only shown in non-production
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const countdownRef = useRef(null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (step === 2) {
      setCountdown(600);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setOtpError('OTP expired. Please go back and request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [step]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Step 1: Submit credentials → request OTP
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Try 2FA first; if endpoint is unavailable (local dev / not yet deployed) fall back to direct login
    try {
      const data = await adminApi.requestAdminOtp(email, password);
      setPendingUserId(data.pending_user_id);
      setDevOtp(data.dev_otp || null);
      setStep(2);
    } catch (otpErr) {
      // 2FA endpoint not available (dev mode, not yet deployed, or PHP server down)
      // Fall back transparently to direct login
      try {
        const loginData = await adminApi.login(email, password);
        if (onLoginSuccess) onLoginSuccess(loginData.user);
      } catch (loginErr) {
        setError(loginErr.message || 'Authentication failed. Check credentials and ensure the PHP server is running.');
      }
    } finally {
      setLoading(false);
    }
  };


  // Step 2: Verify OTP → receive JWT
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);

    try {
      const data = await adminApi.verifyAdminOtp(pendingUserId, otp.trim());
      clearInterval(countdownRef.current);
      if (onLoginSuccess) onLoginSuccess(data.user);
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setLoading(true);
    try {
      const data = await adminApi.requestAdminOtp(email, password);
      setPendingUserId(data.pending_user_id);
      setDevOtp(data.dev_otp || null);
      setCountdown(600);
      setOtp('');
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4FA] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-brand-border shadow-sm">
            <img src="/valerie.png" alt="VALERIÉ" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <h2 className="text-2xl font-editorial font-bold text-brand-tertiary">
              Operational Atelier Portal
            </h2>
            <p className="text-xs text-brand-muted mt-1">
              Desktop-first management suite for catalog, orders & advertising campaigns.
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            STEP 1 — Credentials
        ════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-8 border border-brand-border shadow-luxury space-y-6">
            <div className="flex items-center space-x-2 pb-4 border-b border-brand-border/60 text-xs font-caps tracking-widest text-brand-primary font-bold">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>ROLE-BASED STAFF ACCESS — STEP 1 OF 2</span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  Staff / Admin Email
                </label>
                <div className="relative">
                  <input
                    type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@valeriejewels.com"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-4 py-2.5 pl-10 text-xs font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-2xs"
                  />
                  <Mail className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password" required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-4 py-2.5 pl-10 text-xs font-medium text-brand-tertiary focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-2xs"
                  />
                  <Lock className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Verifying credentials...' : 'Continue — Send OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Prefill for Demo */}
            <div className="pt-2 border-t border-brand-border/60">
              <span className="text-[10px] font-caps uppercase tracking-wider text-brand-muted block mb-2">
                Fast Demo Credential Prefill:
              </span>
              <button
                type="button"
                onClick={() => { setEmail('admin@valeriejewels.com'); setPassword('Admin@Valerie2026!'); }}
                className="w-full text-left p-2.5 rounded-xl bg-[#FAF8FC] border border-brand-border hover:border-brand-primary text-xs flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-brand-tertiary">Valerie Owner (Full Admin)</span>
                  <span className="block text-[10px] text-brand-muted">admin@valeriejewels.com</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  All Privileges
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 2 — OTP Verification
        ════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-8 border border-brand-border shadow-luxury space-y-6">
            <div className="flex items-center space-x-2 pb-4 border-b border-brand-border/60 text-xs font-caps tracking-widest text-brand-primary font-bold">
              <KeyRound className="w-4 h-4 text-brand-primary" />
              <span>2-FACTOR VERIFICATION — STEP 2 OF 2</span>
            </div>

            {/* Status */}
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs space-y-1">
              <p className="font-semibold flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>Credentials verified</span>
              </p>
              <p>A 6-digit OTP has been sent to <strong>{email}</strong></p>
              <p className="text-[10px]">
                Expires in{' '}
                <span className={`font-bold font-mono ${countdown < 60 ? 'text-rose-600' : 'text-sky-700'}`}>
                  {formatCountdown(countdown)}
                </span>
              </p>
            </div>

            {/* Dev OTP reveal (non-production only) */}
            {devOtp && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <p className="font-bold text-[10px] uppercase tracking-wider mb-1">🛠 Dev Mode — OTP revealed:</p>
                <p className="font-mono text-2xl font-bold tracking-[8px] text-amber-700">{devOtp}</p>
                <p className="text-[10px] mt-1 text-amber-600">This is only shown in development. Hidden in production.</p>
              </div>
            )}

            {otpError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-caps tracking-wider uppercase text-brand-tertiary font-bold">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="— — — — — —"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[8px] text-brand-tertiary focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-2xs"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6 || countdown === 0}
                className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{otpLoading ? 'Verifying OTP...' : 'Verify & Enter Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Resend + Back */}
            <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setOtpError(''); clearInterval(countdownRef.current); }}
                className="text-brand-muted hover:text-brand-primary transition-colors font-medium"
              >
                ← Back to credentials
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="inline-flex items-center space-x-1 text-brand-primary hover:underline font-semibold disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{loading ? 'Sending...' : 'Resend OTP'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Back to storefront link */}
        <div className="text-center">
          <a href="/" className="text-xs text-brand-muted hover:text-brand-primary transition-colors inline-flex items-center space-x-1">
            <span>← Return to Customer Storefront</span>
          </a>
        </div>
      </div>
    </div>
  );
}
