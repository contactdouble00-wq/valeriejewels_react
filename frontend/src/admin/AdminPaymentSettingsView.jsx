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
  Smartphone
} from 'lucide-react';
import { adminApi } from './adminApi';

export default function AdminPaymentSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  // Configuration state
  const [settings, setSettings] = useState({
    gateway_mode: 'sandbox',
    fastrr_app_id: 'vj_fastrr_app_test',
    fastrr_secret_key: 'vj_fastrr_secret_test_2026',
    fastrr_webhook_secret: 'vj_fastrr_whsec_test',
    sms_provider: 'sandbox',
    sms_fast2sms_api_key: '',
    prepaid_discount: 50,
    prepaid_gift_title: 'Free Zircon Necklace',
    prepaid_gift_subtitle: 'Included complimentary with all prepaid orders',
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

        {/* Section 2: Checkout OTP & SMS Delivery Engine */}
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-brand-tertiary font-caps tracking-wider uppercase">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              <span>2. Checkout OTP & SMS Delivery Engine</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              settings.sms_provider === 'sandbox'
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {settings.sms_provider === 'sandbox' ? '⚡ Sandbox Simulation (OTP: 123456)' : '📲 Live Cellular SMS Active'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SMS Provider Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-tertiary">OTP Verification Mode</label>
              <select
                value={settings.sms_provider || 'sandbox'}
                onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
                className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-brand-tertiary focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="sandbox">Sandbox / Demo Mode (Test Code 123456 • Zero SMS Cost)</option>
                <option value="fast2sms">Fast2SMS Gateway (Real SMS to Indian Numbers)</option>
                <option value="twilio">Twilio SMS Gateway (Global Cellular Delivery)</option>
              </select>
              <p className="text-[10.5px] text-brand-muted">
                {settings.sms_provider === 'sandbox'
                  ? '💡 In Sandbox mode, no physical cellular SMS is sent. Customers use test code 123456 or 1-click Auto-Fill so you can test orders without SMS gateway bills.'
                  : 'Delivers real SMS verification codes to customer phones using your API credentials.'}
              </p>
            </div>

            {/* API Key */}
            {settings.sms_provider === 'fast2sms' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-tertiary">Fast2SMS API Key</label>
                <input
                  type="password"
                  value={settings.sms_fast2sms_api_key || ''}
                  onChange={(e) => setSettings({ ...settings, sms_fast2sms_api_key: e.target.value })}
                  placeholder="Enter Fast2SMS Authorization Key"
                  className="w-full bg-[#FAF8FC] border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-tertiary focus:outline-none focus:border-brand-primary"
                />
                <p className="text-[10.5px] text-brand-muted">
                  Obtain from your Fast2SMS Developer Dashboard to send real SMS over Indian cellular networks.
                </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Partial COD Toggle */}
            <div className="space-y-2 p-3.5 bg-[#FAF8FC] rounded-xl border border-brand-border/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-tertiary">Enable Partial COD</span>
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
