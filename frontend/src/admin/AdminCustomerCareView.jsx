import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { adminApi } from './adminApi';

const DEFAULT_SUPPORT = {
  drawerButtonText: 'Customer Care: +91 70163 47945',
  whatsappNumber: '+91 70163 47945',
  whatsappMessage: 'Hello Valerie Jewels, I have an inquiry about my order / jewelry.',
  phone: '+91 90234 22392',
  email: 'orders@valeriejewels.in',
  hours: '7 days a week, 8:00 AM – 4:00 PM',
  address: 'Patel Chowk, Rajkot, Gujarat',
};

export default function AdminCustomerCareView() {
  const [supportData, setSupportData] = useState(DEFAULT_SUPPORT);
  const [fullSettings, setFullSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getHomepageSettings();
      if (data) {
        setFullSettings(data);
        if (data.customerSupport) {
          setSupportData({
            ...DEFAULT_SUPPORT,
            ...data.customerSupport,
          });
        }
      }
    } catch (err) {
      console.warn('Could not load remote support settings, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setSupportData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        ...(fullSettings || {}),
        customerSupport: supportData,
      };
      await adminApi.updateHomepageSettings(payload);
      setFullSettings(payload);
      setFeedback({
        type: 'success',
        message: 'Customer Care & WhatsApp settings saved! Live storefront and mobile drawer updated immediately.',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save customer care settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset Customer Care and WhatsApp details to default Valerie Jewels contacts?')) {
      setSupportData(DEFAULT_SUPPORT);
      setFeedback({
        type: 'success',
        message: 'Reverted to defaults in editor. Click "Save Live Changes" to publish.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const cleanWaNumber = (supportData.whatsappNumber || '917016347945').replace(/\D/g, '');
  const testWaUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(supportData.whatsappMessage || 'Hello Valerie Jewels, I have an inquiry.')}`;

  return (
    <div className="p-6 sm:p-8 space-y-6 w-full max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-border shadow-xs">
        <div>
          <div className="inline-flex items-center space-x-2 text-[10px] font-caps uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold mb-1">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Storefront Contact & WhatsApp Central</span>
          </div>
          <h2 className="text-2xl font-editorial font-bold text-brand-tertiary mt-1">
            Customer Care & WhatsApp Support
          </h2>
          <p className="text-xs text-brand-muted font-light mt-0.5 max-w-2xl">
            Control the floating green WhatsApp action button in the slide-out mobile menu, storefront footer hotline, concierge links, and welcome messages.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-tertiary hover:border-gray-400 transition-colors flex items-center space-x-1.5"
            title="Revert back to default contact info"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold tracking-wider uppercase shadow-md hover:bg-brand-primary-hover disabled:opacity-50 transition-all flex items-center space-x-2 active:scale-95"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Live Changes'}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Live Interactive Preview Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FAF8FD] to-[#F2EBF9] border border-brand-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-caps uppercase tracking-wider text-brand-primary font-bold flex items-center space-x-2">
            <Smartphone className="w-4 h-4" />
            <span>Live Mobile Drawer Button Preview</span>
          </span>
          <a
            href={testWaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Test Open WhatsApp Chat</span>
            <ExternalLink className="w-3 h-3 text-emerald-600/70" />
          </a>
        </div>

        {/* Exact Mobile Drawer Bottom Simulation */}
        <div className="max-w-md mx-auto p-4 rounded-xl bg-white border border-brand-border shadow-xs space-y-3">
          <div className="text-[10px] uppercase font-bold tracking-widest text-brand-muted/70 text-center">
            Mobile Slide-out Navigation Drawer — Bottom Button
          </div>
          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold flex items-center justify-center space-x-2 shadow-2xs">
            <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
            <span>{supportData.drawerButtonText || 'Customer Care: +91 70163 47945'}</span>
          </div>
          <div className="text-center text-[10px] text-brand-muted font-light">
            WhatsApp Target URL: <span className="font-mono text-emerald-700 font-semibold">https://wa.me/{cleanWaNumber}</span>
          </div>
        </div>

        {/* Footer Strip Simulation */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-white/90 border border-brand-border/70 text-xs text-brand-muted space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest text-brand-muted/70">
            Storefront Footer Contact Preview
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>📍 {supportData.address || 'Patel Chowk, Rajkot, Gujarat'}</span>
            <span>📞 {supportData.phone || '+91 90234 22392'}</span>
            <span className="text-emerald-700 font-semibold">💬 WA: {supportData.whatsappNumber || '+91 70163 47945'}</span>
            <span>✉️ {supportData.email || 'orders@valeriejewels.in'}</span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-base font-editorial font-bold text-brand-tertiary border-b border-brand-border/60 pb-3 flex items-center space-x-2">
          <Headphones className="w-4 h-4 text-brand-primary" />
          <span>Concierge & Support Configuration</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field 1: Drawer Button Label */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-brand-primary" />
              <span>Mobile Drawer Button Text</span>
            </label>
            <input
              type="text"
              value={supportData.drawerButtonText || ''}
              onChange={(e) => handleFieldChange('drawerButtonText', e.target.value)}
              placeholder="Customer Care: +91 70163 47945"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              The exact label shown on the green quick-assistance button in the mobile navigation drawer.
            </p>
          </div>

          {/* Field 2: WhatsApp Phone Number */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Concierge Number</span>
            </label>
            <input
              type="text"
              value={supportData.whatsappNumber || ''}
              onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
              placeholder="+91 70163 47945"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              Include country code (e.g. <span className="font-mono">+91 70163 47945</span>).
            </p>
          </div>

          {/* Field 3: Pre-filled WhatsApp Welcome Message */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60 md:col-span-2">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-brand-primary" />
              <span>Pre-filled WhatsApp Chat Message</span>
            </label>
            <input
              type="text"
              value={supportData.whatsappMessage || ''}
              onChange={(e) => handleFieldChange('whatsappMessage', e.target.value)}
              placeholder="Hello Valerie Jewels, I have an inquiry about my order / jewelry."
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              When a visitor taps the WhatsApp button on mobile or desktop, this message is automatically typed in their WhatsApp input.
            </p>
          </div>

          {/* Field 4: Direct Phone Hotline */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-primary" />
              <span>Direct Calling Phone Hotline</span>
            </label>
            <input
              type="text"
              value={supportData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="+91 90234 22392"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              Used for telephone links and invoices.
            </p>
          </div>

          {/* Field 5: Support Email */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-primary" />
              <span>Concierge Support Email</span>
            </label>
            <input
              type="email"
              value={supportData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="orders@valeriejewels.in"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              Official email for order inquiries, returns, and support escalation.
            </p>
          </div>

          {/* Field 6: Support Hours */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-primary" />
              <span>Support Schedule / Operating Hours</span>
            </label>
            <input
              type="text"
              value={supportData.hours || ''}
              onChange={(e) => handleFieldChange('hours', e.target.value)}
              placeholder="7 days a week, 8:00 AM – 4:00 PM"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              Shown in the footer copyright line and policy documents.
            </p>
          </div>

          {/* Field 7: Atelier Address */}
          <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF9FC] border border-brand-border/60">
            <label className="text-xs font-bold text-brand-tertiary flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
              <span>Atelier Location / City</span>
            </label>
            <input
              type="text"
              value={supportData.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="Patel Chowk, Rajkot, Gujarat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-medium"
            />
            <p className="text-[11px] text-brand-muted font-light">
              Physical dispatch atelier location shown next to the pin icon.
            </p>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20 pt-4">
          <div className="flex items-center space-x-2 text-xs text-brand-tertiary font-medium">
            <CheckCircle className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Clicking "Save Live Changes" instantly updates the mobile drawer and storefront.</span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold tracking-wider uppercase shadow-xs hover:bg-brand-primary-hover disabled:opacity-50 transition-all flex items-center space-x-2 active:scale-95 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Live Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
