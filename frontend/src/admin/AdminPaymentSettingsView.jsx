import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  Gift,
  Truck,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Copy,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminPaymentSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  // 1-Click Operations state
  const [togglingMethod, setTogglingMethod] = useState(null);
  const [instantSuccessMsg, setInstantSuccessMsg] = useState(null);
  const [partialAdvanceInput, setPartialAdvanceInput] = useState('199');
  const [updatingPartialAmount, setUpdatingPartialAmount] = useState(false);

  // Configuration state
  const [settings, setSettings] = useState({
    gateway_mode: 'live',
    checkout_engine: 'shiprocket_fastrr',
    fastrr_app_id: 'TAlJIqacN8rB0njv',
    fastrr_secret_key: 'WWlzNX4C6mHwUUVUsGlUb36LCRBR8qe0',
    fastrr_webhook_secret: 'vj_fastrr_whsec_test',
    razorpay_key_id: '',
    razorpay_key_secret: '',
    sms_provider: 'fastrr',
    prepaid_discount: 50,
    prepaid_gift_title: 'Free Zircon Necklace',
    prepaid_gift_subtitle: 'Included complimentary with all prepaid orders',
    online_payment_enabled: true,
    partial_cod_enabled: true,
    partial_advance: 199,
    cod_fee: 0,
    cod_available: true,
    checkout_banner_text: '🎁 Prepaid Orders = ₹50 OFF + Free Luxury Gift + ⚡ Priority Shipping',
    exit_intent_enabled: true,
    exit_intent_title: 'Wait! Are you sure you want to exit?',
    exit_intent_message: 'High-demand handcrafted pieces in your bag might sell out before your next visit.',
    testimonial_quote: '“The Korean earrings collection with velvet box is breathtaking! Quality feels like real 18K gold. Absolutely loved the free zircon gift.”',
    testimonial_author: 'Ananya Sharma, Verified Buyer • New Delhi',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getPaymentSettings();
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
        if (data.partial_advance !== undefined && data.partial_advance !== null) {
          setPartialAdvanceInput(String(data.partial_advance));
        }
      }
    } catch (err) {
      setError('Failed to load payment settings. Using local fallback.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePartialAdvance = async (newAmount) => {
    const numeric = Math.round(Number(newAmount));
    if (isNaN(numeric) || numeric < 1) {
      setError('Please enter a valid partial advance token deposit (minimum ₹1).');
      return;
    }

    setUpdatingPartialAmount(true);
    setError(null);

    const updatedSettings = {
      ...settings,
      partial_advance: numeric,
    };

    setSettings(updatedSettings);
    setPartialAdvanceInput(String(numeric));

    try {
      const updated = await adminApi.updatePaymentSettings(updatedSettings);
      if (updated) {
        setSettings((prev) => ({ ...prev, ...updated }));
        setPartialAdvanceInput(String(updated.partial_advance ?? numeric));
      }
      setInstantSuccessMsg(`Partial COD advance deposit set to ₹${numeric} (Live updated on checkout & product pages)!`);
      setTimeout(() => setInstantSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update partial payment amount');
    } finally {
      setUpdatingPartialAmount(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.updatePaymentSettings(settings);
      if (updated) {
        setSettings((prev) => ({ ...prev, ...updated }));
        setPartialAdvanceInput(String(updated.partial_advance ?? settings.partial_advance));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update payment settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSingleClickToggle = async (key) => {
    const currentVal = key === 'online_payment_enabled'
      ? settings.online_payment_enabled !== false
      : !!settings[key];
    const nextVal = !currentVal;

    // Safety validation: Ensure at least one payment method stays enabled
    const onlineActive = key === 'online_payment_enabled' ? nextVal : (settings.online_payment_enabled !== false);
    const partialActive = key === 'partial_cod_enabled' ? nextVal : !!settings.partial_cod_enabled;
    const codActive = key === 'cod_available' ? nextVal : !!settings.cod_available;

    if (!onlineActive && !partialActive && !codActive) {
      setError('Cannot disable all payment options. At least one payment method (Full COD, Partial COD, or Online Payment) must remain active for checkout.');
      return;
    }

    setTogglingMethod(key);
    setError(null);

    const updatedSettings = {
      ...settings,
      [key]: nextVal,
    };

    // Optimistically update local UI state immediately
    setSettings(updatedSettings);

    try {
      const updated = await adminApi.updatePaymentSettings(updatedSettings);
      if (updated) {
        setSettings((prev) => ({ ...prev, ...updated }));
      }
      const labels = {
        cod_available: 'Full Cash on Delivery (COD)',
        partial_cod_enabled: 'Partial COD (Smart Split Advance)',
        online_payment_enabled: '100% Online Payment (Prepaid UPI/Cards)',
      };
      setInstantSuccessMsg(`${labels[key] || key} turned ${nextVal ? 'ON (Active on Storefront)' : 'OFF (Hidden from Storefront)'}!`);
      setTimeout(() => setInstantSuccessMsg(null), 3500);
    } catch (err) {
      // Rollback to previous state on error
      setSettings(settings);
      setError(err.message || 'Failed to toggle payment method. Please try again.');
    } finally {
      setTogglingMethod(null);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/payments/webhook.php`
    : 'https://valeriejewels.com/api/payments/webhook.php';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };


  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center space-x-3 text-brand-muted">
        <RefreshCw className="w-5 h-5 animate-spin text-brand-primary" />
        <span className="text-sm font-medium">Loading Fastrr & Payment Engine Configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-editorial font-bold text-brand-tertiary">
              Fastrr 1-Click Checkout & Payment Rules
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-caps tracking-wider uppercase font-bold bg-purple-100 text-brand-primary border border-purple-200">
              {settings.gateway_mode === 'live' ? '🟢 Live Production' : '🧪 Sandbox Mode'}
            </span>
          </div>
          <p className="text-xs text-brand-muted mt-1 font-light">
            Configure Fastrr 1-Click payment routing, instant prepaid discounts, partial COD risk protection, and exit-intent recovery.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadSettings}
            className="p-2.5 rounded-xl border border-brand-border bg-white text-brand-tertiary hover:bg-brand-surface transition-all"
            title="Reload settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-caps tracking-wider uppercase font-bold shadow-md hover:shadow-luxury-hover transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved & Live!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">Payment rules updated successfully! The storefront checkout has been refreshed.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* ══════════════════════════════════════════════════════════════
            MASTER 1-CLICK PAYMENT CONTROLS (COD, PARTIAL COD, ONLINE)
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-white via-purple-50/20 to-white rounded-2xl border-2 border-brand-primary/30 p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3 relative">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Zap className="w-4 h-4 fill-brand-primary" />
                </div>
                <h2 className="text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
                  Master 1-Click Payment Operations Hub
                </h2>
              </div>
              <p className="text-[11.5px] text-brand-muted mt-1">
                Toggle payment methods ON or OFF in a single click. Changes take effect instantly on storefront checkout without needing to click Save.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-caps tracking-wider uppercase font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Single-Click Auto-Save</span>
              </span>
            </div>
          </div>

          {/* Instant feedback notification */}
          {instantSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in shadow-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{instantSuccessMsg}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono">Live synced</span>
            </div>
          )}

          {/* 3 Operational Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 relative">
            
            {/* 1. Full Cash on Delivery (COD) Card */}
            <div className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              settings.cod_available
                ? 'bg-white border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/20'
                : 'bg-gray-50/90 border-gray-200 opacity-80'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      settings.cod_available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-brand-tertiary">Cash on Delivery (COD)</h3>
                      <span className="text-[10px] text-brand-muted">100% Doorstep Payment</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-caps tracking-wider uppercase font-bold border ${
                    settings.cod_available
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-150 text-gray-600 border-gray-300'
                  }`}>
                    {settings.cod_available ? '● Active' : '○ Off'}
                  </span>
                </div>

                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Customers pay 100% cash upon doorstep package arrival.
                  {settings.cod_fee > 0 ? ` (+₹${settings.cod_fee} handling surcharge)` : ' (Zero COD surcharge)'}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-border/40 mt-3 flex items-center justify-between">
                <span className="text-[10px] font-medium text-brand-muted">
                  {settings.cod_available ? 'Shown on Checkout' : 'Hidden from Checkout'}
                </span>
                <button
                  type="button"
                  disabled={togglingMethod === 'cod_available'}
                  onClick={() => handleSingleClickToggle('cod_available')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    settings.cod_available
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } disabled:opacity-50`}
                >
                  {togglingMethod === 'cod_available' ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : settings.cod_available ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>ON (Click to Turn Off)</span>
                    </>
                  ) : (
                    <>
                      <span>OFF (Click to Turn On)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Partial COD (Smart Split Advance) Card */}
            <div className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              settings.partial_cod_enabled
                ? 'bg-white border-purple-500/60 shadow-xs ring-1 ring-purple-500/20'
                : 'bg-gray-50/90 border-gray-200 opacity-80'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      settings.partial_cod_enabled ? 'bg-purple-100 text-brand-primary' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-brand-tertiary">Partial COD (Smart Split)</h3>
                      <span className="text-[10px] text-brand-muted">RTO Protection Engine</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-caps tracking-wider uppercase font-bold border ${
                    settings.partial_cod_enabled
                      ? 'bg-purple-50 text-brand-primary border-purple-200'
                      : 'bg-gray-150 text-gray-600 border-gray-300'
                  }`}>
                    {settings.partial_cod_enabled ? '● Active' : '○ Off'}
                  </span>
                </div>

                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Requires <strong className="text-brand-tertiary font-mono">₹{settings.partial_advance}</strong> UPI token deposit now + remaining on delivery. Cuts RTO fake orders by 70%+.
                </p>

                {/* Interactive Partial Advance Amount Controller */}
                <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-100/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-brand-tertiary uppercase tracking-wider">
                      Advance Token Deposit
                    </span>
                    <span className="text-xs font-mono font-extrabold text-brand-primary">
                      ₹{settings.partial_advance}
                    </span>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {[99, 149, 199, 249, 299].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleUpdatePartialAdvance(preset)}
                        disabled={updatingPartialAmount}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          Number(settings.partial_advance) === preset
                            ? 'bg-brand-primary text-white shadow-2xs'
                            : 'bg-white text-brand-tertiary border border-gray-200 hover:border-brand-primary/50'
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>

                  {/* Custom Input & Instant Set Button */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1 text-[11px] font-bold text-brand-muted">₹</span>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={partialAdvanceInput}
                        onChange={(e) => setPartialAdvanceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdatePartialAdvance(partialAdvanceInput);
                          }
                        }}
                        placeholder="Custom amount"
                        className="w-full bg-white border border-brand-border rounded-lg pl-6 pr-2 py-1 text-xs font-mono font-bold text-brand-tertiary focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={updatingPartialAmount || !partialAdvanceInput || Number(partialAdvanceInput) === Number(settings.partial_advance)}
                      onClick={() => handleUpdatePartialAdvance(partialAdvanceInput)}
                      className="px-2.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-[10.5px] font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1 shrink-0"
                    >
                      {updatingPartialAmount ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      <span>Set</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border/40 mt-3 flex items-center justify-between">
                <span className="text-[10px] font-medium text-brand-muted">
                  {settings.partial_cod_enabled ? 'Shown on Checkout' : 'Hidden from Checkout'}
                </span>
                <button
                  type="button"
                  disabled={togglingMethod === 'partial_cod_enabled'}
                  onClick={() => handleSingleClickToggle('partial_cod_enabled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    settings.partial_cod_enabled
                      ? 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-2xs'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } disabled:opacity-50`}
                >
                  {togglingMethod === 'partial_cod_enabled' ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : settings.partial_cod_enabled ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>ON (Click to Turn Off)</span>
                    </>
                  ) : (
                    <>
                      <span>OFF (Click to Turn On)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Online Payment (100% Prepaid) Card */}
            <div className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              settings.online_payment_enabled !== false
                ? 'bg-white border-blue-500/60 shadow-xs ring-1 ring-blue-500/20'
                : 'bg-gray-50/90 border-gray-200 opacity-80'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      settings.online_payment_enabled !== false ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-brand-tertiary">100% Online Payment</h3>
                      <span className="text-[10px] text-brand-muted">Prepaid UPI & Cards</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-caps tracking-wider uppercase font-bold border ${
                    settings.online_payment_enabled !== false
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-150 text-gray-600 border-gray-300'
                  }`}>
                    {settings.online_payment_enabled !== false ? '● Active' : '○ Off'}
                  </span>
                </div>

                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Instant payment via UPI (GPay, PhonePe, Paytm), NetBanking & Cards.
                  {settings.prepaid_discount > 0 && ` Includes ₹${settings.prepaid_discount} discount.`}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-border/40 mt-3 flex items-center justify-between">
                <span className="text-[10px] font-medium text-brand-muted">
                  {settings.online_payment_enabled !== false ? 'Shown on Checkout' : 'Hidden from Checkout'}
                </span>
                <button
                  type="button"
                  disabled={togglingMethod === 'online_payment_enabled'}
                  onClick={() => handleSingleClickToggle('online_payment_enabled')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    settings.online_payment_enabled !== false
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } disabled:opacity-50`}
                >
                  {togglingMethod === 'online_payment_enabled' ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : settings.online_payment_enabled !== false ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>ON (Click to Turn Off)</span>
                    </>
                  ) : (
                    <>
                      <span>OFF (Click to Turn On)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
        
        {/* Section 1: Fastrr Gateway Mode & Credentials */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Zap className="w-4 h-4 text-brand-primary" />
              <span>1. Checkout Engine & Gateway Credentials</span>
            </div>
            <span className="text-[11px] text-brand-muted">Shiprocket Fastrr & Razorpay</span>
          </div>

          {/* Checkout Engine Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-tertiary">Active Checkout Architecture</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, checkout_engine: 'shiprocket_fastrr' })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  (settings.checkout_engine || 'shiprocket_fastrr') === 'shiprocket_fastrr'
                    ? 'border-brand-primary bg-purple-50/60 ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-brand-tertiary flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    Shiprocket Fastrr (Recommended)
                  </span>
                  {(settings.checkout_engine || 'shiprocket_fastrr') === 'shiprocket_fastrr' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary text-white font-bold">Selected</span>
                  )}
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Everlasting-style 1-Click checkout with pan-India address pre-fill (50M+ buyers) and instant Razorpay UPI/Card routing.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, checkout_engine: 'razorpay_direct' })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.checkout_engine === 'razorpay_direct'
                    ? 'border-brand-primary bg-purple-50/60 ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-brand-tertiary flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Direct Razorpay Standard
                  </span>
                  {settings.checkout_engine === 'razorpay_direct' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary text-white font-bold">Selected</span>
                  )}
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Direct official Razorpay Checkout SDK popup modal for instant UPI QR, PhonePe, GPay, NetBanking & Cards.
                </p>
              </button>
            </div>
          </div>

          {/* Gateway Environment Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-tertiary">Environment Mode</label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, gateway_mode: 'sandbox' })}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                  settings.gateway_mode === 'sandbox'
                    ? 'border-brand-primary bg-purple-50 text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Sandbox / Test Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, gateway_mode: 'live' })}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                  settings.gateway_mode === 'live'
                    ? 'border-brand-primary bg-purple-50 text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Live Production</span>
              </button>
            </div>
            <p className="text-[11px] text-brand-muted font-light">
              {settings.gateway_mode === 'sandbox'
                ? 'Sandbox mode allows risk-free testing without debiting real bank accounts or customer wallets.'
                : 'Live mode charges customer accounts via your production Razorpay & Shiprocket credentials.'}
            </p>
          </div>

          {/* Grid of Credentials: Fastrr + Razorpay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">

            {/* Fastrr Credentials Box */}
            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/70 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200/50 pb-2">
                <span className="text-xs font-bold text-brand-tertiary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  Shiprocket Checkout (Fastrr) API Keys
                </span>
                <a
                  href="https://checkout.shiprocket.in"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10.5px] text-brand-primary hover:underline flex items-center gap-1"
                >
                  Dashboard <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* App ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-brand-tertiary">Fastrr App ID</label>
                <input
                  type="text"
                  value={settings.fastrr_app_id || ''}
                  onChange={(e) => setSettings({ ...settings, fastrr_app_id: e.target.value })}
                  placeholder="e.g. vj_fastrr_app_live_xxxx"
                  className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Secret Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-brand-tertiary">Fastrr Secret Key</label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[10px] text-brand-primary hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={settings.fastrr_secret_key || ''}
                  onChange={(e) => setSettings({ ...settings, fastrr_secret_key: e.target.value })}
                  placeholder="vj_fastrr_sec_xxxx"
                  className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Webhook Secret */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-brand-tertiary">Fastrr Webhook Signing Secret</label>
                <input
                  type="password"
                  value={settings.fastrr_webhook_secret || ''}
                  onChange={(e) => setSettings({ ...settings, fastrr_webhook_secret: e.target.value })}
                  placeholder="whsec_xxxx"
                  className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Razorpay Credentials Box */}
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200/50 pb-2">
                <span className="text-xs font-bold text-brand-tertiary flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  Razorpay Payment Gateway API Keys
                </span>
                <a
                  href="https://dashboard.razorpay.com/app/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10.5px] text-blue-700 hover:underline flex items-center gap-1"
                >
                  Dashboard <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Razorpay Key ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-brand-tertiary">Razorpay Key ID</label>
                <input
                  type="text"
                  value={settings.razorpay_key_id || ''}
                  onChange={(e) => setSettings({ ...settings, razorpay_key_id: e.target.value })}
                  placeholder="rzp_live_xxxx or rzp_test_xxxx"
                  className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
                <p className="text-[10px] text-brand-muted">Starts with <code className="font-mono bg-white px-1 rounded">rzp_live_</code> for live or <code className="font-mono bg-white px-1 rounded">rzp_test_</code> for testing.</p>
              </div>

              {/* Razorpay Key Secret */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-brand-tertiary">Razorpay Key Secret</label>
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                    className="text-[10px] text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    {showRazorpaySecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showRazorpaySecret ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showRazorpaySecret ? 'text' : 'password'}
                  value={settings.razorpay_key_secret || ''}
                  onChange={(e) => setSettings({ ...settings, razorpay_key_secret: e.target.value })}
                  placeholder="Enter your Razorpay Key Secret"
                  className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
                <p className="text-[10px] text-brand-muted">Kept securely encrypted on the server; never exposed to customer browsers.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 border border-blue-100 text-[10.5px] text-blue-800 leading-relaxed">
                💡 <strong>Unified Settlement:</strong> Both Fastrr 1-Click and direct modal route all settlements to your registered Razorpay bank account.
              </div>
            </div>

          </div>

          {/* Live Webhook URL Callback Display */}
          <div className="space-y-1 pt-1 border-t border-brand-border/40">
            <label className="text-xs font-semibold text-brand-tertiary">Webhook Callback URL (for Shiprocket & Razorpay Webhooks)</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full bg-gray-100 border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-muted select-all cursor-text"
              />
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="p-2 rounded-xl border border-brand-border bg-white text-brand-tertiary hover:bg-brand-surface text-xs shrink-0 transition-all flex items-center space-x-1 cursor-pointer"
                title="Copy Webhook URL"
              >
                {webhookCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10.5px] text-brand-muted">
              Add this webhook endpoint in your Razorpay Dashboard (under Settings → Webhooks) for payment confirmation events (<code className="font-mono text-[10px] bg-gray-100 px-1 rounded">order.paid</code>, <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">payment.captured</code>).
            </p>
          </div>

        </div>

        {/* Section 2: Fastrr Native Mobile OTP & Address Verification */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              <span>2. Mobile OTP & Address Verification</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {settings.sms_provider === 'fast2sms'
                  ? 'Fast2SMS Cellular Active'
                  : settings.sms_provider === 'twofactor'
                  ? '2Factor Cellular Active'
                  : 'Fastrr 1-Click Verification Active'}
              </span>
            </span>
          </div>

          {/* SMS Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-tertiary">SMS & OTP Delivery Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, sms_provider: 'fastrr' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  (settings.sms_provider || 'fastrr') === 'fastrr'
                    ? 'border-brand-primary bg-purple-50 text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    Fastrr Instant
                  </span>
                  {(settings.sms_provider || 'fastrr') === 'fastrr' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-primary text-white font-bold">Selected</span>
                  )}
                </div>
                <p className="text-[10.5px] leading-tight">Instant 1-Click Auto-Fill (code 123456). Zero SMS costs or DLT delays.</p>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, sms_provider: 'fast2sms' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.sms_provider === 'fast2sms'
                    ? 'border-brand-primary bg-purple-50 text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Fast2SMS (India)</span>
                  {settings.sms_provider === 'fast2sms' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-primary text-white font-bold">Selected</span>
                  )}
                </div>
                <p className="text-[10.5px] leading-tight">Sends real cellular SMS OTPs to Indian mobile numbers via Fast2SMS API.</p>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, sms_provider: 'twofactor' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.sms_provider === 'twofactor'
                    ? 'border-brand-primary bg-purple-50 text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                    : 'border-brand-border bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">2Factor.in (India)</span>
                  {settings.sms_provider === 'twofactor' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-primary text-white font-bold">Selected</span>
                  )}
                </div>
                <p className="text-[10.5px] leading-tight">Dedicated Indian transactional SMS OTP gateway with TRAI DLT routing.</p>
              </button>
            </div>
          </div>

          {/* Conditional API Key inputs */}
          {settings.sms_provider === 'fast2sms' && (
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2 animate-fade-in">
              <label className="text-xs font-bold text-brand-tertiary">Fast2SMS Authorization API Key</label>
              <input
                type="text"
                value={settings.fast2sms_api_key || ''}
                onChange={(e) => setSettings({ ...settings, fast2sms_api_key: e.target.value })}
                placeholder="Enter your Fast2SMS API Key"
                className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
              <p className="text-[10.5px] text-brand-muted">Get your key from <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="text-brand-primary underline">fast2sms.com</a> → Dev API.</p>
            </div>
          )}

          {settings.sms_provider === 'twofactor' && (
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2 animate-fade-in">
              <label className="text-xs font-bold text-brand-tertiary">2Factor.in API Key</label>
              <input
                type="text"
                value={settings.twofactor_api_key || ''}
                onChange={(e) => setSettings({ ...settings, twofactor_api_key: e.target.value })}
                placeholder="Enter your 2Factor.in API Key"
                className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
              <p className="text-[10.5px] text-brand-muted">Get your key from <a href="https://2factor.in" target="_blank" rel="noreferrer" className="text-brand-primary underline">2factor.in</a> dashboard.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/70 space-y-1.5">
              <div className="flex items-center gap-2 text-brand-primary font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero External SMS Fees</span>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                In Fastrr Instant Verification mode, 1-Click Auto-Fill (code 123456) lets shoppers proceed without third-party wallet top-ups or DLT delays.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>50M+ Shopper Network</span>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                Once customer enters their 6-digit OTP, Fastrr automatically pre-fills saved delivery addresses, name, and email from over 50 million Indian shoppers in 1 click.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>Pre-Approved TRAI DLT</span>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                Fully compliant with Telecom Regulatory Authority of India (TRAI) regulations with pre-approved transactional OTP templates and high-priority cellular delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Prepaid Discount & Complimentary Luxury Perk */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Gift className="w-4 h-4 text-brand-primary" />
              <span>3. Prepaid Incentives & Complimentary Gift (High Conversion)</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              MadeWidLove Benchmark
            </span>
          </div>

          {/* Online Payment Method Toggle in Section 3 */}
          <div className="p-3.5 bg-[#FAF8FC] rounded-xl border border-brand-border/70 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-brand-tertiary">Enable 100% Online Payment (Prepaid UPI/Cards)</span>
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border ${
                  settings.online_payment_enabled !== false ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-150 text-gray-500 border-gray-300'
                }`}>
                  {settings.online_payment_enabled !== false ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-brand-muted font-light">
                Allows customers to pay instantly via UPI apps (GPay, PhonePe, Paytm), NetBanking, and Credit/Debit Cards.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.online_payment_enabled !== false}
              onChange={(e) => setSettings({ ...settings, online_payment_enabled: e.target.checked })}
              className="w-4 h-4 accent-brand-primary cursor-pointer shrink-0 ml-3"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Prepaid Discount */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Instant Prepaid Discount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-brand-muted">₹</span>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={settings.prepaid_discount}
                  onChange={(e) => setSettings({ ...settings, prepaid_discount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-brand-tertiary"
                />
              </div>
              <p className="text-[10.5px] text-brand-muted font-light">
                Auto-deducted when customer selects UPI, Card, or NetBanking at checkout.
              </p>
            </div>

            {/* Gift Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Free Gift Item Name</label>
              <input
                type="text"
                value={settings.prepaid_gift_title}
                onChange={(e) => setSettings({ ...settings, prepaid_gift_title: e.target.value })}
                placeholder="Free Zircon Necklace"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary font-medium"
              />
              <p className="text-[10.5px] text-brand-muted font-light">
                Appears on the checkout badge, product page perk box, and customer order invoice.
              </p>
            </div>

            {/* Gift Subtitle */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Free Gift Ad Copy / Subtitle</label>
              <input
                type="text"
                value={settings.prepaid_gift_subtitle}
                onChange={(e) => setSettings({ ...settings, prepaid_gift_subtitle: e.target.value })}
                placeholder="Included complimentary with all prepaid orders"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Partial COD (RTO Protection) & Standard COD */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <CreditCard className="w-4 h-4 text-brand-primary" />
              <span>4. Smart Partial COD (RTO Engine) & Standard Cash on Delivery</span>
            </div>
            <span className="text-[11px] text-brand-muted">Risk Mitigation</span>
          </div>

          {/* Two Master Checkboxes in Section 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full COD Toggle */}
            <div className="space-y-2 p-3.5 bg-[#FAF8FC] rounded-xl border border-brand-border/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-tertiary">Enable Cash on Delivery (Full COD)</span>
                <input
                  type="checkbox"
                  checked={settings.cod_available}
                  onChange={(e) => setSettings({ ...settings, cod_available: e.target.checked })}
                  className="w-4 h-4 accent-brand-primary cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-brand-muted font-light leading-snug">
                Allows customers to pay 100% cash upon doorstep delivery.
              </p>
            </div>

            {/* Partial COD Toggle */}
            <div className="space-y-2 p-3.5 bg-[#FAF8FC] rounded-xl border border-brand-border/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-tertiary">Enable Partial COD (Smart Split)</span>
                <input
                  type="checkbox"
                  checked={settings.partial_cod_enabled}
                  onChange={(e) => setSettings({ ...settings, partial_cod_enabled: e.target.checked })}
                  className="w-4 h-4 accent-brand-primary cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-brand-muted font-light leading-snug">
                Reduces Return-to-Origin (RTO) fake orders by 70%+ by collecting a small token advance upfront.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Advance Deposit Amount */}
            <div className="space-y-2 p-3.5 bg-[#FAF8FC] rounded-xl border border-brand-border/70">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-tertiary">Partial COD Advance Deposit (₹)</label>
                <span className="text-xs font-mono font-extrabold text-brand-primary">₹{settings.partial_advance}</span>
              </div>
              <p className="text-[10.5px] text-brand-muted font-light leading-snug">
                Initial deposit collected via UPI now to guarantee delivery dispatch. Remainder collected at doorstep.
              </p>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-brand-muted font-medium">Quick Presets:</span>
                {[99, 149, 199, 249, 299].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleUpdatePartialAdvance(preset)}
                    disabled={updatingPartialAmount}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      Number(settings.partial_advance) === preset
                        ? 'bg-brand-primary text-white shadow-2xs'
                        : 'bg-white text-brand-tertiary border border-gray-200 hover:border-brand-primary/50'
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>

              {/* Custom Input & Instant Update */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-brand-muted">₹</span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={partialAdvanceInput}
                    onChange={(e) => {
                      setPartialAdvanceInput(e.target.value);
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setSettings({ ...settings, partial_advance: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdatePartialAdvance(partialAdvanceInput);
                      }
                    }}
                    placeholder="Enter deposit amount"
                    className="w-full bg-white border border-brand-border rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <button
                  type="button"
                  disabled={updatingPartialAmount || !partialAdvanceInput || Number(partialAdvanceInput) === Number(settings.partial_advance)}
                  onClick={() => handleUpdatePartialAdvance(partialAdvanceInput)}
                  className="px-3 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                >
                  {updatingPartialAmount ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Update Amount</span>
                </button>
              </div>
            </div>

            {/* Full COD Handling Fee */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Full COD Convenience Surcharge (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-brand-muted">₹</span>
                <input
                  type="number"
                  min="0"
                  max="250"
                  value={settings.cod_fee}
                  onChange={(e) => setSettings({ ...settings, cod_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-brand-tertiary"
                />
              </div>
              <p className="text-[10.5px] text-brand-muted font-light">
                Convenience surcharge added when customer opts for 100% Cash on Delivery (set to 0 for Free COD).
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: 1-Click Fastrr Modal Branding & Conversion Messaging */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <span>5. Fastrr Modal Banners, Exit-Intent & Social Proof</span>
            </div>
            <span className="text-[11px] text-brand-muted">Customer Experience</span>
          </div>

          <div className="space-y-4">
            {/* Top Checkout Announcement */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Top Checkout Announcement Banner</label>
              <input
                type="text"
                value={settings.checkout_banner_text}
                onChange={(e) => setSettings({ ...settings, checkout_banner_text: e.target.value })}
                placeholder="🎁 Prepaid Orders = ₹50 OFF + Free Luxury Gift + ⚡ Priority Shipping"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-tertiary"
              />
            </div>

            {/* Exit-Intent Popup Controls */}
            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Exit-Intent Recovery Pop-up (Prevents Abandonment)</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.exit_intent_enabled}
                  onChange={(e) => setSettings({ ...settings, exit_intent_enabled: e.target.checked })}
                  className="w-4 h-4 accent-brand-primary cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-brand-tertiary">Pop-up Header</label>
                  <input
                    type="text"
                    value={settings.exit_intent_title}
                    onChange={(e) => setSettings({ ...settings, exit_intent_title: e.target.value })}
                    className="w-full bg-white border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-tertiary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-brand-tertiary">Pop-up Message Hook</label>
                  <input
                    type="text"
                    value={settings.exit_intent_message}
                    onChange={(e) => setSettings({ ...settings, exit_intent_message: e.target.value })}
                    className="w-full bg-white border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-tertiary"
                  />
                </div>
              </div>
            </div>

            {/* Social Proof Testimonial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-brand-tertiary">Embedded Customer Review Quote</label>
                <textarea
                  rows={2}
                  value={settings.testimonial_quote}
                  onChange={(e) => setSettings({ ...settings, testimonial_quote: e.target.value })}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary font-serif italic"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-tertiary">Review Author & Location</label>
                <input
                  type="text"
                  value={settings.testimonial_author}
                  onChange={(e) => setSettings({ ...settings, testimonial_author: e.target.value })}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-tertiary"
                />
              </div>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
