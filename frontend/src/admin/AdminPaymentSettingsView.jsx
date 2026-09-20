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
  Send,
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
  const [showFast2SmsKey, setShowFast2SmsKey] = useState(false);
  const [showShiprocketPassword, setShowShiprocketPassword] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  // SMS Diagnostic test states
  const [testPhone, setTestPhone] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState(null);

  // 1-Click Operations state
  const [togglingMethod, setTogglingMethod] = useState(null);
  const [instantSuccessMsg, setInstantSuccessMsg] = useState(null);

  // Configuration state
  const [settings, setSettings] = useState({
    gateway_mode: 'sandbox',
    fastrr_app_id: 'vj_fastrr_app_test',
    fastrr_secret_key: 'vj_fastrr_secret_test_2026',
    fastrr_webhook_secret: 'vj_fastrr_whsec_test',
    sms_provider: 'sandbox',
    sms_fast2sms_api_key: '',
    sms_2factor_api_key: '',
    sms_twilio_sid: '',
    sms_twilio_token: '',
    sms_twilio_from: '',
    sms_fastrr_auth_token: '',
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
      }
    } catch (err) {
      setError('Failed to load payment settings. Using local fallback.');
    } finally {
      setLoading(false);
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

  const handleSendTestSms = async () => {
    const clean = testPhone.replace(/\D/g, '');
    if (clean.length !== 10) {
      setTestSmsResult({ success: false, message: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    setSendingTestSms(true);
    setTestSmsResult(null);
    try {
      const res = await adminApi.sendTestSms({
        phone: clean,
        sms_provider: settings.sms_provider,
        fastrr_app_id: settings.fastrr_app_id,
        fastrr_secret_key: settings.fastrr_secret_key,
        shiprocket_email: settings.shiprocket_email,
        shiprocket_password: settings.shiprocket_password,
        sms_fastrr_auth_token: settings.sms_fastrr_auth_token,
        sms_fast2sms_api_key: settings.sms_fast2sms_api_key,
        sms_2factor_api_key: settings.sms_2factor_api_key,
        sms_twilio_sid: settings.sms_twilio_sid,
        sms_twilio_token: settings.sms_twilio_token,
        sms_twilio_from: settings.sms_twilio_from,
      });
      setTestSmsResult({
        success: true,
        message: res.message || `Test SMS dispatched to +91 ${clean}! Check your phone.`
      });
    } catch (err) {
      setTestSmsResult({
        success: false,
        message: err.message || 'Failed to dispatch test SMS. Please check your API key.'
      });
    } finally {
      setSendingTestSms(false);
    }
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
                  Requires ₹{settings.partial_advance} UPI token deposit now + remaining on delivery. Cuts RTO fake orders by 70%+.
                </p>
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
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Zap className="w-4 h-4 text-brand-primary" />
              <span>1. Fastrr Checkout Engine Credentials</span>
            </div>
            <span className="text-[11px] text-brand-muted">Phase 5 Integration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gateway Mode */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-brand-tertiary">Checkout Mode</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, gateway_mode: 'sandbox' })}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
                    settings.gateway_mode === 'sandbox'
                      ? 'border-brand-primary bg-purple-50 text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                      : 'border-brand-border bg-[#FAF8FC] text-brand-muted hover:text-brand-tertiary'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Sandbox Simulation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, gateway_mode: 'live' })}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
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
                  ? 'Sandbox mode simulates 1-click address prefill, OTP verification, and UPI transactions seamlessly without charging real payment instruments.'
                  : 'Live mode connects directly to Fastrr’s official checkout iframe and API endpoints.'}
              </p>
            </div>

            {/* App ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Fastrr App ID</label>
              <input
                type="text"
                value={settings.fastrr_app_id || ''}
                onChange={(e) => setSettings({ ...settings, fastrr_app_id: e.target.value })}
                placeholder="vj_fastrr_app_live_xxxx"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-brand-tertiary">Fastrr Secret Key</label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[10px] text-brand-primary hover:underline flex items-center space-x-1"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <input
                type={showSecret ? 'text' : 'password'}
                value={settings.fastrr_secret_key || ''}
                onChange={(e) => setSettings({ ...settings, fastrr_secret_key: e.target.value })}
                placeholder="vj_fastrr_sec_live_xxxx"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Webhook Secret */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Webhook Signing Secret</label>
              <input
                type="password"
                value={settings.fastrr_webhook_secret || ''}
                onChange={(e) => setSettings({ ...settings, fastrr_webhook_secret: e.target.value })}
                placeholder="whsec_xxxx"
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Live Webhook URL Callback Display */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Webhook Callback URL (for Fastrr Dashboard)</label>
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
                  className="p-2 rounded-xl border border-brand-border bg-white text-brand-tertiary hover:bg-brand-surface text-xs shrink-0 transition-all flex items-center space-x-1"
                  title="Copy Webhook URL"
                >
                  {webhookCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Checkout OTP & Real SMS Delivery Engine */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              <span>2. Checkout OTP & Real SMS Delivery Engine</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              settings.sms_provider === 'sandbox'
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {settings.sms_provider === 'sandbox' ? '⚡ Sandbox Simulation (OTP: 123456)' : `📲 Live SMS Active (${settings.sms_provider})`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SMS Provider Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">SMS Gateway Provider</label>
              <select
                value={settings.sms_provider || 'fastrr'}
                onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-tertiary focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="fastrr">Fastrr (Shiprocket Checkout) • Exactly like MadeWidLove</option>
                <option value="fast2sms">Fast2SMS Gateway (Alternative India SMS)</option>
                <option value="twofactor">2Factor.in (Alternative Indian OTP Gateway)</option>
                <option value="twilio">Twilio SMS Gateway (Global Cellular Delivery)</option>
                <option value="sandbox">Sandbox / Demo Simulation (Test Code 123456 • Zero SMS cost)</option>
              </select>
              <p className="text-[10.5px] text-brand-muted">
                {settings.sms_provider === 'fastrr' && 'Shiprocket Fastrr sends real cellular SMS under registered telecom header FSTRR / SHPRKT and pre-fills delivery addresses from 50M+ Indian buyers.'}
                {settings.sms_provider === 'fast2sms' && 'Fast2SMS delivers real cellular SMS directly to any Indian +91 number in 2–5 seconds with pre-approved OTP route.'}
                {settings.sms_provider === 'twofactor' && '2Factor.in provides dedicated Indian OTP SMS infrastructure.'}
                {settings.sms_provider === 'twilio' && 'Twilio sends global SMS via Twilio REST API.'}
                {settings.sms_provider === 'sandbox' && '💡 No cellular SMS is sent. Test OTP is 123456 with 1-click Auto-Fill.'}
              </p>
            </div>

            {/* Provider 1: Fastrr (Shiprocket Checkout) */}
            {settings.sms_provider === 'fastrr' && (
              <div className="space-y-3 md:col-span-2 p-4 rounded-xl bg-purple-50/50 border border-purple-200/80">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>Shiprocket Fastrr Integration Credentials</span>
                  </div>
                  <a
                    href="https://app.shiprocket.in/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Shiprocket Dashboard</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-brand-tertiary">Fastrr Channel App ID / Store Slug</label>
                    <input
                      type="text"
                      value={settings.fastrr_app_id || ''}
                      onChange={(e) => setSettings({ ...settings, fastrr_app_id: e.target.value })}
                      placeholder="e.g. valerie_jewels or App ID"
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono"
                    />
                    <p className="text-[10px] text-brand-muted mt-0.5">Your Fastrr merchant store identifier</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-brand-tertiary">Fastrr Secret Key / API Token</label>
                    <input
                      type="password"
                      value={settings.fastrr_secret_key || ''}
                      onChange={(e) => setSettings({ ...settings, fastrr_secret_key: e.target.value })}
                      placeholder="vj_fastrr_sec_live_xxxx"
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs font-mono"
                    />
                    <p className="text-[10px] text-brand-muted mt-0.5">Found under Fastrr / Shiprocket Developer API settings</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-brand-tertiary">Shiprocket API User Email (Optional)</label>
                    <input
                      type="email"
                      value={settings.shiprocket_email || ''}
                      onChange={(e) => setSettings({ ...settings, shiprocket_email: e.target.value })}
                      placeholder="api.user@valeriejewels.com"
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-brand-tertiary">Shiprocket API User Password (Optional)</label>
                      <button
                        type="button"
                        onClick={() => setShowShiprocketPassword(!showShiprocketPassword)}
                        className="text-[10px] text-brand-muted hover:text-brand-primary flex items-center gap-1"
                      >
                        {showShiprocketPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showShiprocketPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showShiprocketPassword ? "text" : "password"}
                      value={settings.shiprocket_password || ''}
                      onChange={(e) => setSettings({ ...settings, shiprocket_password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-white border border-brand-border rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 border border-purple-200/60 text-[11px] text-brand-tertiary">
                  💡 <strong>How it works:</strong> When a customer clicks <em>ORDER NOW</em>, Fastrr connects directly with Shiprocket's Indian telecom infrastructure to dispatch the SMS OTP under sender <strong>FSTRR</strong> and pre-populates their saved address.
                </div>
              </div>
            )}

            {/* Provider 2: Fast2SMS */}
            {settings.sms_provider === 'fast2sms' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-brand-tertiary">Fast2SMS Authorization Key</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowFast2SmsKey(!showFast2SmsKey)}
                      className="text-[11px] text-brand-muted hover:text-brand-primary flex items-center gap-1 cursor-pointer"
                    >
                      {showFast2SmsKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showFast2SmsKey ? 'Hide' : 'Show Key'}</span>
                    </button>
                    <a
                      href="https://www.fast2sms.com/dashboard/dev-api"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-brand-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Open Fast2SMS Dev API</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showFast2SmsKey ? "text" : "password"}
                    value={settings.sms_fast2sms_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, sms_fast2sms_api_key: e.target.value })}
                    placeholder="Paste Fast2SMS API Key from fast2sms.com > Dev API"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <p className="text-[10.5px] text-brand-muted">
                  Log in to <strong>fast2sms.com</strong> → click <strong>Dev API</strong> in the left sidebar → copy the key under <strong>"YOUR API AUTHORIZATION KEY"</strong>.
                </p>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>TRAI / Fast2SMS Activation Requirement:</span>
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Under Indian telecom regulations, Fast2SMS requires newly registered accounts to complete a one-time <strong>₹100 wallet recharge</strong> on fast2sms.com or complete <strong>Website Verification</strong> under the <em>OTP Message</em> menu before API messages can be sent. Until recharged, the store gracefully uses instant test code <strong>123456</strong> so customers can still check out.
                  </p>
                </div>
              </div>
            )}

            {/* Provider 3: 2Factor.in */}
            {settings.sms_provider === 'twofactor' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-brand-tertiary">2Factor.in API Key</label>
                  <a
                    href="https://2factor.in/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-primary hover:underline flex items-center gap-1"
                  >
                    <span>Get 2Factor Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={settings.sms_2factor_api_key || ''}
                  onChange={(e) => setSettings({ ...settings, sms_2factor_api_key: e.target.value })}
                  placeholder="Paste 2Factor.in API Key"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
              </div>
            )}

            {/* Provider 4: Twilio */}
            {settings.sms_provider === 'twilio' && (
              <div className="space-y-2 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-brand-tertiary">Twilio Account SID</label>
                  <input
                    type="text"
                    value={settings.sms_twilio_sid || ''}
                    onChange={(e) => setSettings({ ...settings, sms_twilio_sid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-tertiary">Twilio Auth Token</label>
                  <input
                    type="password"
                    value={settings.sms_twilio_token || ''}
                    onChange={(e) => setSettings({ ...settings, sms_twilio_token: e.target.value })}
                    placeholder="Auth Token"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-tertiary">Twilio Sender Number</label>
                  <input
                    type="text"
                    value={settings.sms_twilio_from || ''}
                    onChange={(e) => setSettings({ ...settings, sms_twilio_from: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Test SMS Diagnostic Tool */}
          <div className="mt-2 p-4 rounded-xl bg-purple-50/60 border border-brand-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                <span>Test Real SMS Delivery to Your Mobile Number</span>
              </span>
              <span className="text-[10px] text-brand-muted">Instant verification test</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center border border-brand-border rounded-xl bg-white overflow-hidden flex-1 shadow-2xs">
                <span className="px-3 py-2 bg-gray-50 border-r border-brand-border text-xs font-semibold text-brand-tertiary select-none">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter your 10-digit mobile number"
                  className="flex-1 px-3 py-2 text-xs text-brand-tertiary focus:outline-none bg-transparent font-mono"
                />
              </div>

              <button
                type="button"
                disabled={sendingTestSms || testPhone.length !== 10}
                onClick={handleSendTestSms}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {sendingTestSms ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Send Test SMS Now</span>
                  </>
                )}
              </button>
            </div>

            {testSmsResult && (
              <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in ${
                testSmsResult.success 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {testSmsResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testSmsResult.message}</span>
              </div>
            )}
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">Partial COD Advance Deposit (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-brand-muted">₹</span>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  value={settings.partial_advance}
                  onChange={(e) => setSettings({ ...settings, partial_advance: parseFloat(e.target.value) || 199 })}
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-brand-tertiary"
                />
              </div>
              <p className="text-[10.5px] text-brand-muted font-light">
                Initial deposit collected via UPI now. Remainder collected on delivery.
              </p>
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
