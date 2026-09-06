import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  ArrowRight,
  Truck,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

export default function AuthModal({ onOpenTracking }) {
  const {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    register,
    logout,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (authModalMode === 'register') {
        await register({ name, email, phone, password });
      } else if (authModalMode === 'admin') {
        await login({ email, password, isAdminPortal: true });
      } else {
        await login({ email, password, isAdminPortal: false });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-tertiary/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-brand-border flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-brand-surface text-brand-tertiary hover:text-brand-primary transition-colors border border-brand-border shadow-sm"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LOGGED IN VIEW */}
        {isAuthenticated ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-brand-primary-light flex items-center justify-center text-brand-primary text-xl font-bold font-editorial border border-brand-primary/20 shadow-inner">
                {user.name ? user.name.charAt(0).toUpperCase() : 'V'}
              </div>
              <h2 className="font-editorial text-2xl font-bold text-brand-tertiary">
                {user.name}
              </h2>
              <p className="text-xs text-brand-muted font-light">{user.email}</p>
              <div className="pt-1">
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-caps uppercase tracking-wider font-bold ${
                  isAdmin ? 'bg-purple-100 text-brand-primary' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  <Shield className="w-3 h-3" />
                  <span>{user.role}</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-brand-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Account Status</span>
                <span className="font-bold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active & Verified</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Shopping Freedom</span>
                <span className="font-medium text-brand-primary">1-Click Express</span>
              </div>
            </div>

            {/* Customer Orders Shortcut */}
            <div className="space-y-2">
              <span className="text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                Track & Manage Orders
              </span>

              <button
                type="button"
                onClick={() => {
                  closeAuthModal();
                  if (onOpenTracking) {
                    onOpenTracking('');
                  }
                }}
                className="w-full p-3 rounded-xl border border-brand-border bg-white hover:border-brand-primary/50 text-left flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-brand-tertiary block group-hover:text-brand-primary transition-colors">
                      Live Courier Tracking
                    </span>
                    <span className="text-[10px] text-brand-muted font-light">
                      Track AWB, delivery date & manage cancellations
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-brand-muted group-hover:text-brand-primary transition-colors" />
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={closeAuthModal}
                className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all"
              >
                Continue Shopping
              </button>
              <button
                onClick={logout}
                className="w-full py-2.5 px-4 rounded-xl border border-brand-border hover:bg-red-50 text-red-600 text-xs font-caps tracking-wider uppercase font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

        ) : (
          /* NOT LOGGED IN / SIGN IN / REGISTER FORM */
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Header branding */}
            <div className="text-center space-y-2 pt-2">
              <img src="/valerie.png" alt="VALERIÉ" className="h-7 mx-auto w-auto object-contain" />
              <p className="text-xs text-brand-muted font-light">
                {authModalMode === 'register' 
                  ? 'Create an account for faster checkout and order tracking.' 
                  : authModalMode === 'admin' 
                  ? 'Administrator & Staff Portal Authentication' 
                  : 'Sign in to access your saved wishlist and order history.'}
              </p>
            </div>

            {/* Non-Mandatory Reassurance Notice */}
            {authModalMode !== 'admin' && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Shopping without an account?</strong> You can always check out freely as a guest!
                </span>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            {authModalMode !== 'admin' && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#FAF7FC] border border-brand-border">
                <button
                  type="button"
                  onClick={() => { setAuthModalMode('login'); setErrorMessage(null); }}
                  className={`py-2 text-xs font-caps uppercase tracking-wider font-semibold rounded-lg transition-all ${
                    authModalMode === 'login' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-muted hover:text-brand-tertiary'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthModalMode('register'); setErrorMessage(null); }}
                  className={`py-2 text-xs font-caps uppercase tracking-wider font-semibold rounded-lg transition-all ${
                    authModalMode === 'register' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-muted hover:text-brand-tertiary'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name (Register only) */}
              {authModalMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rhea Kapoor"
                      className="w-full bg-[#FAF7FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#FAF7FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Phone (Register only) */}
              {authModalMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                    Mobile Phone <span className="text-brand-muted font-light lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FAF7FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-caps uppercase tracking-wider text-brand-tertiary font-bold block">
                  Password {authModalMode === 'register' && <span className="text-brand-muted font-light lowercase">(min 8 characters)</span>}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF7FC] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-widest uppercase font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>
                  {loading 
                    ? 'Verifying...' 
                    : authModalMode === 'register' 
                    ? 'Create Account' 
                    : authModalMode === 'admin' 
                    ? 'Sign In to Admin Portal' 
                    : 'Sign In'}
                </span>
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* Admin Portal Toggle / Return to Customer */}
            <div className="pt-2 text-center border-t border-brand-border">
              {authModalMode === 'admin' ? (
                <button
                  type="button"
                  onClick={() => { setAuthModalMode('login'); setErrorMessage(null); }}
                  className="text-xs text-brand-muted hover:text-brand-primary transition-colors font-medium"
                >
                  ← Return to Customer Sign In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAuthModalMode('admin'); setErrorMessage(null); }}
                  className="text-[11px] text-brand-muted hover:text-brand-primary transition-colors font-light flex items-center justify-center space-x-1 mx-auto"
                >
                  <Shield className="w-3 h-3 text-brand-primary" />
                  <span>Are you Valerie Staff? Sign in to Admin Portal</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
